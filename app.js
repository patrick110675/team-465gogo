import { DEFAULT_CONFIG } from "./defaultData.js";
import { initFirebase, listenRecords, listenConfig, saveConfig, saveRecord, removeRecord } from "./firebase.js";
import { currentWeek, weekOptions, uid, formatDate, csvDownload } from "./utils.js";

const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const state = { page: params.get("page")==="checkin" ? "checkin" : "home", adminTab:"teams", formType:"team", week:currentWeek(), records:[], config:null, team:"", name:"", values:{}, search:"", editId:null };

const C=()=>state.config||DEFAULT_CONFIG;
const teams=()=>C().teams||[], teamRules=()=>C().teamRules||[], personalRules=()=>C().personalRules||[], activity=()=>C().activity||DEFAULT_CONFIG.activity, events=()=>C().events||[];
const teamByName=n=>teams().find(t=>t.name===n);
const allMembers=()=>teams().flatMap(t=>(t.members||[]).map(m=>({name:m,team:t.name,icon:t.icon})));
const calcScore=(type,vals)=>(type==="team"?teamRules():personalRules()).reduce((s,r)=>s+Number(vals[r.key]||0)*Number(r.points||0),0);
function daysLeft(){const end=new Date(activity().endDate+"T23:59:59"); return Math.max(0,Math.ceil((end-new Date())/86400000));}
function todayCount(){const d=new Date(); d.setHours(0,0,0,0); return state.records.filter(r=>(r.createdAt||0)>=d.getTime()).length;}
function teamRank(week=state.week){const s={};teams().forEach(t=>s[t.name]=0);state.records.forEach(r=>{if((r.recordType==="team"||!r.recordType)&&(week==="ALL"||r.week===week)&&s[r.team]!==undefined)s[r.team]+=Number(r.totalScore||0)});return Object.entries(s).map(([team,score])=>({...teamByName(team),team,score})).sort((a,b)=>b.score-a.score)}
function personRank(week=state.week){const s={};allMembers().forEach(m=>s[m.name]={score:0,team:m.team,icon:m.icon});state.records.forEach(r=>{if(r.recordType==="personal"&&(week==="ALL"||r.week===week)){if(!s[r.name])s[r.name]={score:0,team:r.team,icon:"👤"};s[r.name].score+=Number(r.totalScore||0)}});return Object.entries(s).map(([name,d])=>({name,...d})).sort((a,b)=>b.score-a.score)}
function toast(m){const el=document.createElement("div");el.className="toast";el.textContent=m;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}

function allPeople(){ return teams().flatMap(t=>(t.members||[]).map(name=>({name,team:t.name,icon:t.icon}))); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function currentMonthKey(){ return new Date().toISOString().slice(0,7); }
function getEventById(id){ return events().find(e=>e.id===id); }
function activeEvent(){ return events().find(e=>e.active) || events()[0]; }
function checkinRecordId(ev,name){ return `checkin_${ev.id}_${name}`; }
function attendanceRecord(ev,name){ return state.records.find(r=>r.id===checkinRecordId(ev,name)); }
function isLateByEvent(ev,ts){
  if(!ev || !ev.startTime || !ts) return false;
  const date = ev.date || todayISO();
  const start = new Date(`${date}T${ev.startTime}:00`);
  const grace = Number(ev.graceMinutes ?? 5);
  return ts > start.getTime() + grace * 60000;
}
function statusLabel(status){
  if(status==="present") return "🟢 已到";
  if(status==="late") return "🟠 遲到";
  if(status==="leave") return "🟡 請假";
  return "🔴 未到";
}
function attendanceRows(ev){
  return allPeople().map(p=>{
    const r = attendanceRecord(ev,p.name);
    let status = r?.attendanceStatus || null;
    if(!status && r?.checkin) status = isLateByEvent(ev,r.createdAt) ? "late" : "present";
    return { ...p, record:r, status: status || "absent" };
  });
}
function attendanceSummary(ev){
  const rows = attendanceRows(ev);
  const count = s => rows.filter(r=>r.status===s).length;
  return { total:rows.length, present:count("present"), late:count("late"), leave:count("leave"), absent:count("absent") };
}
function monthlyLeaveCount(name,monthKey=currentMonthKey()){
  return state.records.filter(r=>r.recordType==="attendance" && r.attendanceStatus==="leave" && r.name===name && String(r.eventDate||"").startsWith(monthKey)).length;
}
function quarterEligibility(name){
  const bad = state.records.some(r=>r.recordType==="attendance" && r.name===name && (r.attendanceStatus==="absent" || r.attendanceStatus==="late"));
  const overLeave = state.records.some(r=>r.recordType==="attendance" && r.name===name && r.attendanceStatus==="leave" && monthlyLeaveCount(name,String(r.eventDate||"").slice(0,7))>1);
  return !(bad || overLeave);
}

function rulePoint(ruleKey, type="team"){
  const arr = type==="personal" ? personalRules() : teamRules();
  return Number((arr.find(r=>r.key===ruleKey)||{}).points || 0);
}
function eventTemplateConfig(template){
  const map = {
    amr: { label:"AMR例會", attendanceOnly:true, attendKey:null, friendKey:null },
    night: { label:"夜創", attendanceOnly:false, attendKey:"activity_creation_self", friendKey:"activity_creation_friends" },
    dream: { label:"夢想起飛", attendanceOnly:false, attendKey:"activity_creation_self", friendKey:"activity_creation_friends" },
    soft: { label:"軟性活動", attendanceOnly:false, attendKey:"activity_soft_self", friendKey:"activity_soft_friends" }
  };
  return map[template] || map.soft;
}
function eventAttendPoint(ev){ return ev?.attendanceOnly ? 0 : rulePoint(ev.attendKey || "activity_creation_self","team"); }
function eventFriendPoint(ev){ return ev?.attendanceOnly ? 0 : rulePoint(ev.friendKey || "activity_creation_friends","team"); }
function eventTotalPoint(ev, friends=0){ return eventAttendPoint(ev) + Number(friends||0) * eventFriendPoint(ev); }



function shell(content){
  app.innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand"><div class="brand-logo">🐺</div><div><div class="brand-title"><b>AMR</b> 人力特攻隊</div><div class="brand-sub">${activity().subtitle}</div></div></div><div class="menu">${menu("home","🏠","首頁")}${menu("score","➕","新增積分")}${menu("rank","🏆","團隊排行")}${menu("person","👤","個人排行")}${menu("history","🕘","歷史紀錄")}${menu("qr","📅","活動簽到")}${menu("admin","⚙️","設定管理")}</div><div class="side-card"><div class="side-label">⏱ 活動倒數</div><div class="side-value">${daysLeft()}</div><div class="side-small">天</div></div><div class="side-card"><div class="side-label">☆ 本週總積分</div><div class="side-value">${teamRank().reduce((a,b)=>a+b.score,0)}</div><div class="side-small">即時同步</div></div></aside><main class="main"><div class="topbar"><div class="period">${activity().periodName||"本期競賽"}｜${state.week}</div><div class="top-actions"><button class="btn green" data-page="meeting">🖥 晨會模式</button><button class="btn" data-page="admin">⚙</button></div></div>${content}<div class="footer"><span>${activity().title}｜${activity().subtitle}</span><span>🟢 Firebase 即時同步</span></div></main></div><nav class="mobile-nav">${mnav("home","🏠","首頁")}${mnav("score","➕","計分")}${mnav("rank","🏆","排行")}${mnav("history","📜","歷史")}${mnav("admin","⚙","設定")}</nav>`;
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
}
const menu=(p,i,l)=>`<button class="${state.page===p?"active":""}" data-page="${p}"><span>${i}</span>${l}</button>`;
const mnav=(p,i,l)=>`<button class="${state.page===p?"active":""}" data-page="${p}"><span>${i}</span>${l}</button>`;

function renderHome(){const tr=teamRank(),pr=personRank(),top=tr[0],mvp=pr[0];shell(`<div class="grid-main"><section class="hero"><div class="champ-badge">👑 本期冠軍</div><div class="champ-name">${top?.team||"尚無資料"}</div><div class="champ-score">${top?.score||0}<small> 分</small></div><div class="champ-sub">🔥 今日新增 ${todayCount()} 筆</div></section><div class="stack"><div class="mini purple"><div class="mini-label">👑 MVP</div><div class="mini-name">${mvp?.name||"尚無"}</div><div class="mini-score">${mvp?.score||0} 分</div></div><div class="mini blue"><div class="mini-label">📊 團隊數</div><div class="mini-name">${teams().length} 隊</div><div class="mini-score">三個月一換隊名</div></div><div class="mini green"><div class="mini-label">🕘 歷史紀錄</div><div class="mini-name">${state.records.length} 筆</div><div class="mini-score">雲端保存</div></div></div></div><div class="two"><section class="card"><h2>🏆 團隊排行榜</h2>${rankTable(tr,"team").slice(0,3).join("")}<button class="btn gold" data-page="rank" style="width:100%;margin-top:12px">查看完整排行 →</button></section><section class="card"><h2>👤 個人排行榜</h2>${rankTable(pr,"person").slice(0,5).join("")}<button class="btn green" data-page="person" style="width:100%;margin-top:12px">查看完整排行 →</button></section></div><div class="two"><section class="card"><h2>🕘 最新紀錄</h2><div class="hist">${state.records.slice(0,5).map(historyRow).join("")||`<div class="empty">尚無紀錄</div>`}</div></section><section class="card"><h2>⚡ 快速操作</h2><div class="quick-grid"><button class="btn purple quick" data-page="score"><span>＋</span>新增積分</button><button class="btn blue quick" data-page="history"><span>🕘</span>歷史紀錄</button><button class="btn green quick" id="exportBtn"><span>📥</span>匯出 CSV</button><button class="btn red quick" data-page="qr"><span>📱</span>活動 QR</button></div></section></div>`);bindShared();}
function bindShared(){document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});const ex=document.getElementById("exportBtn");if(ex)ex.onclick=exportRows}
function rankTable(rows,type){return rows.map((r,i)=>`<div class="row"><div class="ranknum ${i===0?"top":""}">${i+1}</div><div><div class="rname">${type==="team"?(r.icon||"")+" "+r.team:(r.icon||"👤")+" "+r.name}</div><div class="rsub">${type==="team"?"團隊積分":r.team}</div></div><div class="rscore">${r.score}</div></div>`)}
function historyRow(r){return `<div class="hist-row"><div><div class="hist-name">${r.name}｜${r.team}</div><div class="hist-meta">${r.note||statusLabel(r.attendanceStatus)||"積分紀錄"}</div></div><div class="plus">+${r.totalScore||0}</div><div class="time">${formatDate(r.createdAt)}</div></div>`}

function renderScore(){const rules=state.formType==="team"?teamRules():personalRules(),members=state.team?(teamByName(state.team)?.members||[]):[];shell(`<section class="card form-card"><h2>➕ 新增積分</h2><div class="tabs"><button class="tab ${state.formType==="team"?"active":""}" data-ft="team">團隊積分</button><button class="tab ${state.formType==="personal"?"active":""}" data-ft="personal">個人積分</button></div><div class="form-grid"><label class="field"><span>週次</span><select id="weekSel">${weekOptions().map(w=>`<option ${w===state.week?"selected":""}>${w}</option>`).join("")}</select></label><label class="field"><span>隊伍</span><select id="teamSel"><option value="">請選擇</option>${teams().map(t=>`<option value="${t.name}" ${t.name===state.team?"selected":""}>${t.icon} ${t.name}</option>`).join("")}</select></label></div><label class="field"><span>姓名</span><select id="nameSel" ${state.team?"":"disabled"}><option value="">請選擇</option>${members.map(m=>`<option ${m===state.name?"selected":""}>${m}</option>`).join("")}</select></label>${rules.map(ruleCounter).join("")}<div class="total"><span>本次得分</span><b>${calcScore(state.formType,state.values)} 分</b></div><button class="btn primary" style="width:100%" id="saveBtn">送出積分</button></section>`);document.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{state.formType=b.dataset.ft;state.values={};render()});document.getElementById("weekSel").onchange=e=>state.week=e.target.value;document.getElementById("teamSel").onchange=e=>{state.team=e.target.value;state.name="";render()};document.getElementById("nameSel").onchange=e=>state.name=e.target.value;document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{state.values[b.dataset.inc]=Number(state.values[b.dataset.inc]||0)+1;render()});document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{state.values[b.dataset.dec]=Math.max(0,Number(state.values[b.dataset.dec]||0)-1);render()});document.getElementById("saveBtn").onclick=submitScore}
function ruleCounter(r){return `<div class="score-item"><div><div class="score-name">${r.label}</div><div class="score-meta">+${r.points} 分 / ${r.unit}</div></div><div class="counter"><button data-dec="${r.key}">−</button><div class="num">${Number(state.values[r.key]||0)}</div><button data-inc="${r.key}">＋</button></div></div>`}
async function submitScore(){if(!state.team)return toast("請選隊伍");if(!state.name)return toast("請選姓名");const total=calcScore(state.formType,state.values);if(total<=0)return toast("請新增積分");const safe=state.week.replace(/\//g,"-").replace(/\s/g,"");await saveRecord(`${safe}_${state.name}_${state.formType}_${Date.now()}`,{...state.values,week:state.week,team:state.team,name:state.name,recordType:state.formType,totalScore:total,note:"手動加分",createdAt:Date.now(),updatedAt:Date.now()});toast("新增成功");state.page="home";state.values={};render()}

function renderRank(){shell(`<section class="card"><h2>🏆 團隊排行榜</h2>${rankTable(teamRank(),"team").join("")}</section>`)}
function renderPerson(){shell(`<section class="card"><h2>👤 個人排行榜</h2>${rankTable(personRank(),"person").join("")}</section>`)}
function renderHistory(){shell(`<section class="card"><h2>🕘 歷史紀錄</h2><input id="search" placeholder="搜尋姓名、隊伍、週次" value="${state.search}"><div class="hist" id="hist"></div></section>`);document.getElementById("search").oninput=e=>{state.search=e.target.value;drawHist()};drawHist()}
function drawHist(){const q=state.search.trim();const rows=state.records.filter(r=>!q||`${r.name} ${r.team} ${r.week}`.includes(q));document.getElementById("hist").innerHTML=rows.map(r=>`<div class="hist-row"><div><div class="hist-name">${r.name}｜${r.team}</div><div class="hist-meta">${r.week}｜${r.note||statusLabel(r.attendanceStatus)||"積分紀錄"}</div></div><div class="plus">+${r.totalScore||0}</div><button class="btn red small" data-del="${r.id}">刪</button></div>`).join("")||`<div class="empty">尚無紀錄</div>`;document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(confirm("確定刪除？")){await removeRecord(b.dataset.del);toast("已刪除")}})}

function checkinUrl(){const ev=activeEvent()||{id:"event-main"};return `${location.origin}${location.pathname}?page=checkin&event=${ev.id}`}
function renderQR(){
  const ev=activeEvent();
  const url=checkinUrl(),qr=`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(url)}`;
  const s = ev ? attendanceSummary(ev) : null;
  shell(`<section class="card"><h2>📱 活動 QR Code</h2>
    <p class="muted">需要活動時才建立 QR。同一人同一活動只能簽到一次，不做簽退。</p>
    ${ev?`<p><b>目前活動：</b>${ev.name}｜${ev.date||""}｜${eventTemplateConfig(ev.template).label}${ev.attendanceOnly?`｜AMR不加分｜開始 ${ev.startTime||"未設定"}｜寬限 ${ev.graceMinutes??5} 分鐘`:`｜出席 +${eventAttendPoint(ev)}｜新朋友 +${eventFriendPoint(ev)}/人`}</p>`:`<p class="muted">尚未建立活動，請到設定管理 → 活動 QR 建立。</p>`}
    ${s?`<div class="att-summary"><div>🟢 已到 ${s.present}</div><div>🟠 遲到 ${s.late}</div><div>🟡 請假 ${s.leave}</div><div>🔴 未到 ${s.absent}</div></div>`:""}
    <div class="qr-box"><img class="qr-img" src="${qr}"><div class="qr-url">${url}</div><button class="btn primary" id="copy">複製連結</button></div>
  </section>
  ${ev?attendancePanel(ev):""}`);
  document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText(url);toast("已複製")};
  bindAttendanceActions(ev);
}
function renderCheckin(){
  const ev=events().find(e=>e.id===params.get("event"))||activeEvent()||{id:"event-main",name:"活動簽到",template:"amr",attendanceOnly:true};
  const members=state.team?(teamByName(state.team)?.members||[]):[];
  const friendBlock = ev.attendanceOnly ? "" : `<div class="score-item"><div><div class="score-name">今天帶了幾位新朋友？</div><div class="score-meta">每位新朋友 +${eventFriendPoint(ev)} 分，分數依積分設定</div></div><div class="counter"><button id="friendDec">−</button><div class="num" id="friendNum">0</div><button id="friendInc">＋</button></div></div><div class="total"><span>本次自動加分</span><b id="eventTotal">${eventTotalPoint(ev,0)} 分</b></div>`;
  shell(`<section class="card form-card"><h2>📍 ${ev.name}</h2>
    <p class="muted">${ev.attendanceOnly?`AMR 只做出席管理，不加分｜開始 ${ev.startTime||"未設定"}｜寬限 ${ev.graceMinutes??5} 分鐘`:`掃碼後自動加個人與團隊積分｜出席 +${eventAttendPoint(ev)}｜新朋友 +${eventFriendPoint(ev)}/人`}</p>
    <label class="field"><span>隊伍</span><select id="teamSel"><option value="">請選擇</option>${teams().map(t=>`<option value="${t.name}" ${t.name===state.team?"selected":""}>${t.icon} ${t.name}</option>`).join("")}</select></label>
    <label class="field"><span>姓名</span><select id="nameSel" ${state.team?"":"disabled"}><option value="">請選擇</option>${members.map(m=>`<option ${m===state.name?"selected":""}>${m}</option>`).join("")}</select></label>
    ${friendBlock}
    <button class="btn primary" style="width:100%" id="checkin">${ev.attendanceOnly?"完成簽到":"完成並加分"}</button></section>`);
  document.getElementById("teamSel").onchange=e=>{state.team=e.target.value;state.name="";state.values.eventFriends=state.values.eventFriends||0;render()};
  document.getElementById("nameSel").onchange=e=>state.name=e.target.value;
  if(!ev.attendanceOnly){
    state.values.eventFriends=Number(state.values.eventFriends||0);
    const draw=()=>{document.getElementById("friendNum").textContent=state.values.eventFriends;document.getElementById("eventTotal").textContent=`${eventTotalPoint(ev,state.values.eventFriends)} 分`;};
    document.getElementById("friendDec").onclick=()=>{state.values.eventFriends=Math.max(0,Number(state.values.eventFriends||0)-1);draw();};
    document.getElementById("friendInc").onclick=()=>{state.values.eventFriends=Number(state.values.eventFriends||0)+1;draw();};
    draw();
  }
  document.getElementById("checkin").onclick=()=>submitCheckin(ev)
}
async function submitCheckin(ev){
  if(!state.team)return toast("請選隊伍");
  if(!state.name)return toast("請選姓名");
  const id=checkinRecordId(ev,state.name);
  if(state.records.some(r=>r.id===id))return toast("你已完成本場簽到");
  const now=Date.now();
  const late=ev.attendanceOnly ? isLateByEvent(ev,now) : false;
  const friends=Number(state.values.eventFriends||0);
  const total=ev.attendanceOnly ? 0 : eventTotalPoint(ev,friends);
  await saveRecord(id,{
    checkin:1,eventId:ev.id,eventName:ev.name,eventDate:ev.date||todayISO(),template:ev.template||"amr",
    week:state.week,team:state.team,name:state.name,
    recordType:ev.attendanceOnly?"attendance":"personal",
    attendanceStatus:ev.attendanceOnly?(late?"late":"present"):"present",
    friends,
    attendPoints:ev.attendanceOnly?0:eventAttendPoint(ev),
    friendPoints:ev.attendanceOnly?0:(friends*eventFriendPoint(ev)),
    totalScore:total,
    note:ev.attendanceOnly?`${ev.name} ${late?"遲到":"簽到"}`:`${ev.name} 出席 +${eventAttendPoint(ev)}${friends?`，新朋友 ${friends} 位 +${friends*eventFriendPoint(ev)}`:""}`,
    createdAt:now,updatedAt:now
  });
  toast(ev.attendanceOnly?(late?"簽到成功：遲到":"簽到成功"):`完成：+${total} 分`);
  state.values.eventFriends=0;
  state.page="home";render();
}

function renderMeeting(){
  const tr=teamRank(),pr=personRank(),ev=activeEvent(),s=ev?attendanceSummary(ev):null;
  shell(`<section class="hero" style="text-align:center"><div class="champ-badge">📺 晨會模式</div><div class="champ-name">${tr[0]?.team||"尚無"}</div><div class="champ-score">${tr[0]?.score||0}<small> 分</small></div></section>
  ${ev?`<section class="card"><h2>📍 ${ev.name} 出席狀況</h2><div class="att-summary big"><div>🟢 已到 ${s.present}</div><div>🟠 遲到 ${s.late}</div><div>🟡 請假 ${s.leave}</div><div>🔴 未到 ${s.absent}</div></div>${attendancePanel(ev)}</section>`:""}
  <div class="two"><section class="card"><h2>🏆 團隊戰況</h2>${rankTable(tr,"team").join("")}</section><section class="card"><h2>👑 MVP</h2>${rankTable(pr.slice(0,8),"person").join("")}</section></div>`);
  bindAttendanceActions(ev);
}
function renderAdmin(){shell(`<section class="card"><h2>⚙️ 設定管理</h2><div class="admin-grid"><div class="admin-menu"><button class="${state.adminTab==="teams"?"active":""}" data-at="teams">隊伍管理</button><button class="${state.adminTab==="members"?"active":""}" data-at="members">成員管理</button><button class="${state.adminTab==="events"?"active":""}" data-at="events">活動 QR</button><button class="${state.adminTab==="points"?"active":""}" data-at="points">積分設定</button><button class="${state.adminTab==="system"?"active":""}" data-at="system">系統設定</button></div><div id="adminBody"></div></div></section>`);document.querySelectorAll("[data-at]").forEach(b=>b.onclick=()=>{state.adminTab=b.dataset.at;render()});if(state.adminTab==="teams")adminTeams();if(state.adminTab==="members")adminTeams();if(state.adminTab==="events")adminEvents();if(state.adminTab==="points")adminPoints();if(state.adminTab==="system")adminSystem()}
function adminTeams(){document.getElementById("adminBody").innerHTML=`<div class="form-grid"><input id="newIcon" placeholder="Icon 例如 🐺"><input id="newTeam" placeholder="新增隊伍名稱"></div><button class="btn primary" id="addTeam">新增隊伍</button>${teams().map((t,i)=>`<div class="admin-row"><div class="admin-title">${t.icon} ${t.name}</div><div class="chips">${(t.members||[]).map(m=>`<span class="chip">${m}<button data-rm-m="${i}|${m}">×</button></span>`).join("")}</div><div class="form-grid" style="margin-top:10px"><input id="mem-${i}" placeholder="新增成員"><button class="btn blue" data-add-m="${i}">新增成員</button></div><button class="btn red" data-rm-t="${i}" style="margin-top:10px">刪除隊伍</button></div>`).join("")}`;document.getElementById("addTeam").onclick=async()=>{const name=document.getElementById("newTeam").value.trim(),icon=document.getElementById("newIcon").value.trim()||"🏆";if(!name)return toast("請輸入隊伍");const cfg=structuredClone(C());cfg.teams.push({id:uid("team"),icon,name,members:[]});await saveConfig(cfg)};document.querySelectorAll("[data-add-m]").forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.addM),v=document.getElementById(`mem-${i}`).value.trim();if(!v)return;const cfg=structuredClone(C());cfg.teams[i].members.push(v);await saveConfig(cfg)});document.querySelectorAll("[data-rm-m]").forEach(b=>b.onclick=async()=>{const [i,m]=b.dataset.rmM.split("|"),cfg=structuredClone(C());cfg.teams[Number(i)].members=cfg.teams[Number(i)].members.filter(x=>x!==m);await saveConfig(cfg)});document.querySelectorAll("[data-rm-t]").forEach(b=>b.onclick=async()=>{if(!confirm("刪除隊伍？"))return;const cfg=structuredClone(C());cfg.teams.splice(Number(b.dataset.rmT),1);await saveConfig(cfg)})}
function adminEvents(){
  const today=todayISO();
  document.getElementById("adminBody").innerHTML=`
  <p class="muted">建立活動時先選類型。AMR 只管出席，不加分；夜創、夢想起飛、軟性活動會依照「積分設定」自動計算出席分與新朋友分。</p>
  <label class="field"><span>活動類型</span>
    <select id="evType">
      <option value="amr">📅 AMR例會（不加分）</option>
      <option value="night">🌙 夜創（自動加分）</option>
      <option value="dream">🚀 夢想起飛（自動加分）</option>
      <option value="soft">🎯 軟性活動（自動加分）</option>
    </select>
  </label>
  <div class="form-grid">
    <input id="evName" placeholder="活動名稱，例如 7/5 AMR例會 / 夜創 / 教育訓練">
    <input id="evDate" type="date" value="${today}">
    <input id="evStart" type="time" value="09:00">
    <input id="evGrace" type="number" value="5" placeholder="AMR寬限分鐘">
  </div>
  <button class="btn primary" id="addEv">建立活動 QR</button>
  <button class="btn blue" id="quickAMR" style="margin-top:10px;width:100%">一鍵建立本週 AMR</button>
  ${events().map((e,i)=>`<div class="admin-row">
    <div class="admin-title">${e.name}｜${e.date||""}｜${eventTemplateConfig(e.template).label}${e.attendanceOnly?"｜不加分":`｜出席 +${eventAttendPoint(e)}｜新朋友 +${eventFriendPoint(e)}/人`}</div>
    <button class="btn blue" data-show-qr="${e.id}">顯示 QR / 名單</button>
    <button class="btn red" data-rm-ev="${i}">刪除</button>
  </div>`).join("")}`;
  const add = async(template,name,date,start,grace)=>{
    const tpl=eventTemplateConfig(template);
    if(!name) name = `${new Date(date).getMonth()+1}/${new Date(date).getDate()} ${tpl.label}`;
    const cfg=structuredClone(C());
    cfg.events=cfg.events||[];
    cfg.events.forEach(e=>e.active=false);
    cfg.events.push({
      id:uid("event"),
      template,
      name,
      date,
      startTime:start,
      graceMinutes:Number(grace||5),
      attendanceOnly:tpl.attendanceOnly,
      attendKey:tpl.attendKey,
      friendKey:tpl.friendKey,
      active:true
    });
    await saveConfig(cfg);
    toast("已建立活動 QR");
  };
  document.getElementById("addEv").onclick=()=>add(
    document.getElementById("evType").value,
    document.getElementById("evName").value.trim(),
    document.getElementById("evDate").value,
    document.getElementById("evStart").value,
    document.getElementById("evGrace").value
  );
  document.getElementById("quickAMR").onclick=()=>{
    const d=new Date();
    const label=`${d.getMonth()+1}/${d.getDate()} AMR例會`;
    add("amr",label,today,"09:00",5);
  };
  document.querySelectorAll("[data-show-qr]").forEach(b=>b.onclick=async()=>{
    const cfg=structuredClone(C());
    cfg.events.forEach(e=>e.active=(e.id===b.dataset.showQr));
    await saveConfig(cfg);
    state.page="qr";render();
  });
  document.querySelectorAll("[data-rm-ev]").forEach(b=>b.onclick=async()=>{const cfg=structuredClone(C());cfg.events.splice(Number(b.dataset.rmEv),1);await saveConfig(cfg)});
}

function adminPoints(){const block=(title,type,arr)=>`<h3>${title}</h3>${arr.map((r,i)=>`<div class="rule-row"><input value="${r.label}" disabled><input type="number" value="${r.points}" data-point="${type}|${i}"></div>`).join("")}`;document.getElementById("adminBody").innerHTML=`<p class="muted">項目固定，只能修改分數，避免誤刪規則。</p>${block("團隊積分","team",teamRules())}${block("個人積分","personal",personalRules())}<button class="btn primary" id="savePoints" style="width:100%;margin-top:14px">儲存分數</button><button class="btn red" id="resetPoints" style="width:100%;margin-top:10px">恢復預設分數</button>`;document.getElementById("savePoints").onclick=async()=>{const cfg=structuredClone(C());document.querySelectorAll("[data-point]").forEach(inp=>{const[t,i]=inp.dataset.point.split("|");(t==="team"?cfg.teamRules:cfg.personalRules)[Number(i)].points=Number(inp.value||0)});await saveConfig(cfg);toast("分數已儲存")};document.getElementById("resetPoints").onclick=async()=>{if(!confirm("恢復預設分數？"))return;const cfg=structuredClone(C());cfg.teamRules=DEFAULT_CONFIG.teamRules;cfg.personalRules=DEFAULT_CONFIG.personalRules;await saveConfig(cfg)}}
function adminSystem(){document.getElementById("adminBody").innerHTML=`<label class="field"><span>標題</span><input id="title" value="${activity().title}"></label><label class="field"><span>副標題</span><input id="sub" value="${activity().subtitle}"></label><label class="field"><span>期別名稱</span><input id="period" value="${activity().periodName||""}"></label><label class="field"><span>結束日</span><input type="date" id="end" value="${activity().endDate}"></label><button class="btn primary" id="saveSys">儲存設定</button>`;document.getElementById("saveSys").onclick=async()=>{const cfg=structuredClone(C());cfg.activity={title:document.getElementById("title").value,subtitle:document.getElementById("sub").value,periodName:document.getElementById("period").value,endDate:document.getElementById("end").value};await saveConfig(cfg);toast("已儲存")}}
function exportRows(){csvDownload(`AMR人力特攻隊_${new Date().toISOString().slice(0,10)}.csv`,[["類別","週次","隊伍","姓名","分數","備註","時間"],...state.records.map(r=>[r.recordType,r.week,r.team,r.name,r.totalScore,r.note,r.createdAt?new Date(r.createdAt).toLocaleString("zh-TW"):""])])}
function render(){try{if(state.page==="home")renderHome();else if(state.page==="score")renderScore();else if(state.page==="rank")renderRank();else if(state.page==="person")renderPerson();else if(state.page==="history")renderHistory();else if(state.page==="qr")renderQR();else if(state.page==="checkin")renderCheckin();else if(state.page==="meeting")renderMeeting();else if(state.page==="admin")renderAdmin()}catch(e){app.innerHTML=`<div class="main"><div class="card">系統錯誤：${e.message}</div></div>`;console.error(e)}}
async function boot(){await initFirebase();listenConfig(async cfg=>{if(!cfg){await saveConfig(DEFAULT_CONFIG);state.config=DEFAULT_CONFIG}else state.config=cfg;render()},e=>console.error(e));listenRecords(rows=>{state.records=rows;render()},e=>console.error(e))}
boot();
