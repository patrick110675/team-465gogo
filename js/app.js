import { DEFAULT_CONFIG } from "./defaultData.js";
import { initFirebase, listenRecords, listenConfig, saveConfig, saveRecord, removeRecord } from "./firebase.js";
import { currentWeek, weekOptions, uid, formatDate, csvDownload } from "./utils.js";

const app = document.getElementById("app");
const state = { page:"home", formType:"team", week:currentWeek(), team:"", name:"", values:{}, editId:null, search:"", records:[], config:null, user:null, adminTab:"teams" };

const C = () => state.config || DEFAULT_CONFIG;
const teams = () => C().teams || [];
const teamRules = () => C().teamRules || [];
const personalRules = () => C().personalRules || [];
const activity = () => C().activity || DEFAULT_CONFIG.activity;
const teamByName = name => teams().find(t => t.name === name);
const allMembers = () => teams().flatMap(t => (t.members||[]).map(m => ({ name:m, team:t.name, icon:t.icon })));

function calcScore(type, vals){ return (type==="team"?teamRules():personalRules()).reduce((s,r)=>s+Number(vals[r.key]||0)*Number(r.points||0),0); }
function teamRank(week=state.week){
  const s={}; teams().forEach(t=>s[t.name]=0);
  state.records.forEach(r=>{ if((r.recordType==="team"||!r.recordType) && (week==="ALL"||r.week===week) && s[r.team]!==undefined) s[r.team]+=Number(r.totalScore||0); });
  return Object.entries(s).map(([team,score])=>({...teamByName(team),team,score})).sort((a,b)=>b.score-a.score);
}
function personRank(week=state.week){
  const s={}; allMembers().forEach(m=>s[m.name]={score:0,team:m.team,icon:m.icon});
  state.records.forEach(r=>{ if(r.recordType==="personal" && (week==="ALL"||r.week===week)){ if(!s[r.name]) s[r.name]={score:0,team:r.team,icon:"👤"}; s[r.name].score+=Number(r.totalScore||0); }});
  return Object.entries(s).map(([name,d])=>({name,...d})).sort((a,b)=>b.score-a.score);
}
function todayCount(){ const d=new Date(); d.setHours(0,0,0,0); return state.records.filter(r=>(r.createdAt||0)>=d.getTime()).length; }
function daysLeft(){ const end=new Date(activity().endDate+"T23:59:59"); return Math.max(0,Math.ceil((end-new Date())/86400000)); }
function toast(msg){ const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2300); }

function shell(content){
  app.innerHTML = `
  <div class="app">
    <header class="top">
      <div class="toprow">
        <div><div class="title">🏆 ${activity().title}</div><div class="subtitle">${activity().subtitle || "AMR Team"}</div></div>
        <div class="top-actions"><button class="pill" id="adminBtn">⚙️</button><button class="pill" id="exportBtn">匯出</button></div>
      </div>
    </header>
    ${content}
  </div>
  <nav class="nav"><div class="navin">
    ${nav("home","🏠","首頁")}${nav("score","➕","計分")}${nav("rank","🏆","排行")}${nav("history","📜","歷史")}${nav("meeting","📺","晨會")}
  </div></nav>`;
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page; render();});
  document.getElementById("exportBtn").onclick = exportRows;
  document.getElementById("adminBtn").onclick = ()=>{state.page="admin"; render();};
}
function nav(p,i,l){ return `<button class="navbtn ${state.page===p?"active":""}" data-page="${p}"><span>${i}</span>${l}</button>`; }

function renderHome(){
  const tr=teamRank(), pr=personRank(), top=tr[0], mvp=pr[0];
  shell(`<section class="hero"><h1>即時戰況</h1><p>${state.week}｜活動倒數 ${daysLeft()} 天</p>
  <div class="dash"><div class="dash-card"><div class="dash-label">🥇 團隊冠軍</div><div class="dash-val">${top?.icon||"🏆"} ${top?.team||"尚無"}</div><div class="dash-sub">${top?.score||0} 分</div></div>
  <div class="dash-card"><div class="dash-label">👑 MVP</div><div class="dash-val">${mvp?.name||"尚無"}</div><div class="dash-sub">${mvp?.score||0} 分</div></div>
  <div class="dash-card"><div class="dash-label">🔥 今日新增</div><div class="dash-val">${todayCount()} 筆</div><div class="dash-sub">即時同步</div></div>
  <div class="dash-card"><div class="dash-label">📜 總紀錄</div><div class="dash-val">${state.records.length} 筆</div><div class="dash-sub">雲端保存</div></div></div></section>
  <div class="grid"><button class="quick" data-go="score"><span>📝</span>我要計分</button><button class="quick" data-go="rank"><span>🏆</span>排行榜</button><button class="quick" data-go="history"><span>📜</span>歷史紀錄</button><button class="quick" data-go="admin"><span>⚙️</span>管理中心</button></div>
  <section class="card"><h2 class="sec">🏆 團隊排行</h2>${rankRows(tr,"team")}</section>
  <section class="card"><h2 class="sec">🎉 最新紀錄</h2>${state.records.slice(0,5).map(historyItem).join("")||`<div class="empty">尚無紀錄</div>`}</section>`);
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{state.page=b.dataset.go; render();});
  bindHistory();
}

function renderScore(){
  const rules=state.formType==="team"?teamRules():personalRules();
  const members=state.team ? (teamByName(state.team)?.members||[]) : [];
  shell(`<section class="card"><h2 class="sec">📝 我要計分</h2><div class="tabs"><button class="tab ${state.formType==="team"?"active":""}" data-ft="team">團隊計分</button><button class="tab ${state.formType==="personal"?"active":""}" data-ft="personal">個人計分</button></div>
  <div class="twocol"><label class="field"><span>📅 週次</span><select id="weekSel">${weekOptions().map(w=>`<option ${w===state.week?"selected":""}>${w}</option>`).join("")}</select></label>
  <label class="field"><span>🚩 隊伍</span><select id="teamSel"><option value="">請選擇</option>${teams().map(t=>`<option value="${t.name}" ${t.name===state.team?"selected":""}>${t.icon} ${t.name}</option>`).join("")}</select></label></div>
  <label class="field"><span>👤 姓名</span><select id="nameSel" ${state.team?"":"disabled"}><option value="">請選擇</option>${members.map(m=>`<option ${m===state.name?"selected":""}>${m}</option>`).join("")}</select></label>
  ${rules.map(ruleCounter).join("")}<div class="total"><span>本次得分</span><b>${calcScore(state.formType,state.values)} 分</b></div>
  <button class="btn primary" id="saveBtn">${state.editId?"儲存修改":"送出計分"}</button>${state.editId?`<button class="btn secondary" style="margin-top:10px" id="cancelBtn">取消修改</button>`:""}</section>`);
  document.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{state.formType=b.dataset.ft; state.values={}; state.editId=null; render();});
  document.getElementById("weekSel").onchange=e=>state.week=e.target.value;
  document.getElementById("teamSel").onchange=e=>{state.team=e.target.value; state.name=""; render();};
  document.getElementById("nameSel").onchange=e=>state.name=e.target.value;
  document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{state.values[b.dataset.inc]=Number(state.values[b.dataset.inc]||0)+1; render();});
  document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{state.values[b.dataset.dec]=Math.max(0,Number(state.values[b.dataset.dec]||0)-1); render();});
  document.getElementById("saveBtn").onclick=submitRecord;
  if(document.getElementById("cancelBtn")) document.getElementById("cancelBtn").onclick=()=>{resetForm(); render();};
}
function ruleCounter(r){ return `<div class="score-item"><div><div class="score-name">${r.label}</div><div class="score-meta">+${r.points} 分 / ${r.unit}</div></div><div class="counter"><button data-dec="${r.key}">−</button><div class="num">${Number(state.values[r.key]||0)}</div><button data-inc="${r.key}">＋</button></div></div>`; }
async function submitRecord(){
  if(!state.week) return toast("請選擇週次"); if(!state.team) return toast("請選擇隊伍"); if(!state.name) return toast("請選擇姓名");
  const total=calcScore(state.formType,state.values); if(total<=0) return toast("請先新增分數");
  const safe=state.week.replace(/\//g,"-").replace(/\s/g,""); const id=state.editId || `${safe}_${state.name}_${state.formType}`;
  const old=state.records.find(r=>r.id===state.editId);
  await saveRecord(id,{...state.values,week:state.week,team:state.team,name:state.name,recordType:state.formType,totalScore:total,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  toast(state.editId?"修改成功":"送出成功"); resetForm(); state.page="home"; render();
}
function resetForm(){state.editId=null; state.values={}; state.name="";}

function renderRank(){
  shell(`<section class="card"><h2 class="sec">🏆 排行榜</h2><label class="field"><span>📅 週次</span><select id="weekSel"><option value="ALL" ${state.week==="ALL"?"selected":""}>全部週次</option>${weekOptions().map(w=>`<option ${w===state.week?"selected":""}>${w}</option>`).join("")}</select></label><h3>團隊排行</h3>${rankRows(teamRank(),"team")}<h3>個人英雄榜</h3>${rankRows(personRank(),"person")}</section>`);
  document.getElementById("weekSel").onchange=e=>{state.week=e.target.value; render();};
}
function rankRows(rows,type){ const max=Math.max(...rows.map(r=>r.score),1); return rows.map((r,i)=>`<div class="rank ${i===0&&r.score>0?"first":""}"><div class="medal">${r.score>0?(["🥇","🥈","🥉"][i]||i+1):i+1}</div><div class="main"><div class="rtitle">${type==="team"?(r.icon||"")+" "+r.team:(r.icon||"👤")+" "+r.name}</div><div class="rsub">${type==="team"?"團隊積分":r.team}</div><div class="bar"><i style="width:${Math.round(r.score/max*100)}%"></i></div></div><div class="score">${r.score}</div></div>`).join("") || `<div class="empty">尚無資料</div>`; }

function renderHistory(){
  shell(`<section class="card"><h2 class="sec">📜 歷史紀錄 <span>${state.records.length} 筆</span></h2><input id="search" placeholder="搜尋姓名、隊伍、週次" value="${state.search}"><div id="historyList"></div></section>`);
  document.getElementById("search").oninput=e=>{state.search=e.target.value; drawHistory();};
  drawHistory();
}
function drawHistory(){ const q=state.search.trim(); const list=state.records.filter(r=>!q || `${r.name} ${r.team} ${r.week}`.includes(q)); document.getElementById("historyList").innerHTML=list.map(historyItem).join("") || `<div class="empty">找不到紀錄</div>`; bindHistory(); }
function historyItem(r){ const t=teamByName(r.team); return `<div class="history"><div class="hhead"><div><div class="hname">${t?.icon||""} ${r.name}｜${r.recordType==="personal"?"個人":"團隊"}</div><div class="hmeta">${r.team}｜${r.week}｜${formatDate(r.createdAt)}</div></div><div class="hscore">+${r.totalScore||0}</div></div><div class="actions"><button class="btn secondary small" data-edit="${r.id}">修改</button><button class="btn danger small" data-del="${r.id}">刪除</button></div></div>`; }
function bindHistory(){ document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(confirm("確定刪除？")){await removeRecord(b.dataset.del); toast("已刪除");}}); document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const r=state.records.find(x=>x.id===b.dataset.edit); if(!r)return; state.editId=r.id; state.formType=r.recordType||"team"; state.week=r.week; state.team=r.team; state.name=r.name; state.values={}; (state.formType==="team"?teamRules():personalRules()).forEach(rule=>state.values[rule.key]=Number(r[rule.key]||0)); state.page="score"; render();}); }

function renderMeeting(){
  const tr=teamRank(), pr=personRank();
  shell(`<section class="hero" style="text-align:center"><h1>📺 晨會模式</h1><p>${state.week}</p><div class="big">${tr[0]?.icon||"🏆"} ${tr[0]?.team||"尚無資料"}</div><p>目前第一名：${tr[0]?.score||0} 分</p></section><section class="card"><h2 class="sec">🏆 團隊戰況</h2>${rankRows(tr,"team")}</section><section class="card"><h2 class="sec">👑 MVP</h2>${rankRows(pr.slice(0,8),"person")}</section>`);
}

function renderAdmin(){
  shell(`<section class="card"><h2 class="sec">⚙️ 管理中心</h2><p class="note">這裡修改後會寫入 Firebase，其他手機會同步更新。</p><div class="tabs"><button class="tab ${state.adminTab==="teams"?"active":""}" data-at="teams">隊伍</button><button class="tab ${state.adminTab==="rules"?"active":""}" data-at="rules">分數</button><button class="tab ${state.adminTab==="activity"?"active":""}" data-at="activity">設定</button></div><div id="adminBody"></div></section>`);
  document.querySelectorAll("[data-at]").forEach(b=>b.onclick=()=>{state.adminTab=b.dataset.at; render();});
  if(state.adminTab==="teams") adminTeams();
  if(state.adminTab==="rules") adminRules();
  if(state.adminTab==="activity") adminActivity();
}
function adminTeams(){
  document.getElementById("adminBody").innerHTML = `<h3>新增隊伍</h3><div class="twocol"><label class="field"><span>Icon</span><input id="newIcon" placeholder="🐺"></label><label class="field"><span>隊名</span><input id="newTeam" placeholder="五狼攏來隊"></label></div><button class="btn primary" id="addTeam">新增隊伍</button><h3>目前隊伍與成員</h3><div class="admin-list">${teams().map((t,idx)=>`<div class="admin-row"><div class="row-title">${t.icon} ${t.name}</div><div class="chipline">${(t.members||[]).map(m=>`<span class="chip">${m}<button data-rm-member="${idx}|${m}">×</button></span>`).join("")}</div><div style="display:flex;gap:8px;margin-top:10px"><input id="mem-${idx}" placeholder="新增成員"><button class="btn secondary small" data-add-member="${idx}">新增</button><button class="btn danger small" data-rm-team="${idx}">刪除隊伍</button></div></div>`).join("")}</div>`;
  document.getElementById("addTeam").onclick=async()=>{const name=document.getElementById("newTeam").value.trim(); const icon=document.getElementById("newIcon").value.trim()||"🏆"; if(!name)return toast("請輸入隊名"); const cfg=structuredClone(C()); cfg.teams.push({id:uid("team"),icon,name,color:"#f97316",members:[]}); await saveConfig(cfg); toast("已新增隊伍");};
  document.querySelectorAll("[data-add-member]").forEach(b=>b.onclick=async()=>{const idx=Number(b.dataset.addMember); const val=document.getElementById(`mem-${idx}`).value.trim(); if(!val)return; const cfg=structuredClone(C()); cfg.teams[idx].members.push(val); await saveConfig(cfg); toast("已新增成員");});
  document.querySelectorAll("[data-rm-member]").forEach(b=>b.onclick=async()=>{const [idx,m]=b.dataset.rmMember.split("|"); const cfg=structuredClone(C()); cfg.teams[Number(idx)].members=cfg.teams[Number(idx)].members.filter(x=>x!==m); await saveConfig(cfg); toast("已移除成員");});
  document.querySelectorAll("[data-rm-team]").forEach(b=>b.onclick=async()=>{if(!confirm("確定刪除隊伍？"))return; const cfg=structuredClone(C()); cfg.teams.splice(Number(b.dataset.rmTeam),1); await saveConfig(cfg); toast("已刪除隊伍");});
}
function adminRules(){
  const block=(type,rules)=>`<h3>${type==="team"?"團隊計分":"個人計分"}</h3>${rules.map((r,i)=>`<div class="rule-row"><input value="${r.label}" data-rule-label="${type}|${i}"><input type="number" value="${r.points}" data-rule-point="${type}|${i}"><button class="btn danger small" data-rm-rule="${type}|${i}">刪</button></div>`).join("")}<button class="btn secondary" data-add-rule="${type}">新增${type==="team"?"團隊":"個人"}項目</button>`;
  document.getElementById("adminBody").innerHTML=block("team",teamRules())+block("personal",personalRules())+`<button class="btn primary" id="saveRules" style="margin-top:14px">儲存分數設定</button>`;
  document.querySelectorAll("[data-add-rule]").forEach(b=>b.onclick=async()=>{const cfg=structuredClone(C()); const arr=b.dataset.addRule==="team"?cfg.teamRules:cfg.personalRules; arr.push({key:uid("rule"),label:"新項目",unit:"次",points:1}); await saveConfig(cfg);});
  document.querySelectorAll("[data-rm-rule]").forEach(b=>b.onclick=async()=>{const [type,i]=b.dataset.rmRule.split("|"); const cfg=structuredClone(C()); (type==="team"?cfg.teamRules:cfg.personalRules).splice(Number(i),1); await saveConfig(cfg);});
  document.getElementById("saveRules").onclick=async()=>{const cfg=structuredClone(C()); document.querySelectorAll("[data-rule-label]").forEach(inp=>{const [type,i]=inp.dataset.ruleLabel.split("|"); (type==="team"?cfg.teamRules:cfg.personalRules)[Number(i)].label=inp.value;}); document.querySelectorAll("[data-rule-point]").forEach(inp=>{const [type,i]=inp.dataset.rulePoint.split("|"); (type==="team"?cfg.teamRules:cfg.personalRules)[Number(i)].points=Number(inp.value||0);}); await saveConfig(cfg); toast("分數設定已儲存");};
}
function adminActivity(){
  document.getElementById("adminBody").innerHTML=`<label class="field"><span>網站標題</span><input id="actTitle" value="${activity().title}"></label><label class="field"><span>副標題</span><input id="actSub" value="${activity().subtitle||""}"></label><label class="field"><span>活動結束日</span><input type="date" id="actEnd" value="${activity().endDate||""}"></label><button class="btn primary" id="saveAct">儲存設定</button>`;
  document.getElementById("saveAct").onclick=async()=>{const cfg=structuredClone(C()); cfg.activity={title:document.getElementById("actTitle").value,subtitle:document.getElementById("actSub").value,endDate:document.getElementById("actEnd").value}; await saveConfig(cfg); toast("設定已儲存");};
}

function exportRows(){ const rows=[["類別","週次","隊伍","姓名","得分","時間"]]; state.records.forEach(r=>rows.push([r.recordType==="personal"?"個人":"團隊",r.week||"",r.team||"",r.name||"",r.totalScore||0,r.createdAt?new Date(r.createdAt).toLocaleString("zh-TW"):""])); csvDownload(`AMR人力特攻隊_${new Date().toISOString().slice(0,10)}.csv`,rows); }
function render(){ try{ if(state.page==="home")renderHome(); else if(state.page==="score")renderScore(); else if(state.page==="rank")renderRank(); else if(state.page==="history")renderHistory(); else if(state.page==="meeting")renderMeeting(); else if(state.page==="admin")renderAdmin(); }catch(e){ app.innerHTML=`<div class="app"><div class="error">網站錯誤：${e.message}</div></div>`; console.error(e); } }

async function boot(){
  try{
    state.user=await initFirebase();
    listenConfig(async cfg=>{ if(!cfg){ await saveConfig(DEFAULT_CONFIG); state.config=DEFAULT_CONFIG; } else state.config=cfg; render(); }, e=>app.innerHTML=`<div class="app"><div class="error">設定讀取失敗：${e.message}</div></div>`);
    listenRecords(rows=>{state.records=rows; render();}, e=>app.innerHTML=`<div class="app"><div class="error">資料讀取失敗：${e.message}</div></div>`);
  }catch(e){ app.innerHTML=`<div class="app"><div class="error">Firebase 連線失敗：${e.message}</div></div>`; console.error(e); }
}
boot();
