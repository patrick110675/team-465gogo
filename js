
import{initializeApp}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import{getAuth,signInAnonymously}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import{getFirestore,collection,onSnapshot,doc,setDoc,deleteDoc}from"https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCCBe5b_3jMHYSnwQwQr4r7uNdzm61PWBY",authDomain:"team-465.firebaseapp.com",projectId:"team-465",storageBucket:"team-465.firebasestorage.app",messagingSenderId:"1083534515383",appId:"1:1083534515383:web:b4f466e0ac36d42bc34132"};
const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb),app=document.getElementById("app");

const DEFAULT={settings:{title:"AMR 人力特攻隊",subtitle:"團結・合作・突破・共創榮耀",adminPin:"465"},teams:[{id:"t1",name:"五狼攏來隊",active:true,members:["天景","小怡君","立維","永朋"]},{id:"t2",name:"瀚瀚瀚瀚得第一",active:true,members:["子瀚","靜萱","陳怡君","雅韻"]},{id:"t3",name:"盈在起跑點",active:true,members:["可盈","恩慈","士誼","奎璿","美如"]},{id:"t4",name:"陽光委任隊",active:true,members:["怡蒨","楚涵","永濂","瑀芯"]},{id:"t5",name:"你來就隊",active:true,members:["巧云","乙榛","圜翰","建宏"]}],teamRules:[{key:"activity_creation_self",label:"夢想起飛 / 夜創出席",unit:"次",points:2},{key:"activity_creation_friends",label:"帶新朋友參加夢想起飛 / 夜創",unit:"人",points:3},{key:"activity_soft_self",label:"通訊處軟性活動出席",unit:"次",points:2},{key:"activity_soft_friends",label:"帶新朋友參加軟性活動",unit:"人",points:3},{key:"register_contract",label:"登錄 + 簽約",unit:"人",points:10}],personalRules:[{key:"first_interview",label:"初次面談",unit:"次",points:5},{key:"deep_interview",label:"深度面談",unit:"次",points:8},{key:"self_cop",label:"自己參加 COP",unit:"次",points:8},{key:"friend_cop",label:"帶新朋友參加 COP",unit:"位",points:8}],events:[]};

let S={page:new URLSearchParams(location.search).get("page")==="checkin"?"checkin":"home",cfg:DEFAULT,records:[],team:"",name:"",type:"team",vals:{},admin:"events",adminMode:localStorage.getItem("amrAdmin")==="1"};
const C=()=>S.cfg,teams=()=>C().teams||[],activeTeams=()=>teams().filter(t=>t.active!==false),teamRules=()=>C().teamRules||[],personalRules=()=>C().personalRules||[],events=()=>C().events||[],people=()=>activeTeams().flatMap(t=>t.members.map(name=>({name,team:t.name})));
const toast=m=>{let x=document.createElement("div");x.className="toast";x.textContent=m;document.body.appendChild(x);setTimeout(()=>x.remove(),2000)},uid=p=>p+"-"+Math.random().toString(36).slice(2,9),todayISO=()=>new Date().toISOString().slice(0,10),nowHM=()=>String(new Date().getHours()).padStart(2,"0")+":"+String(new Date().getMinutes()).padStart(2,"0");
const teamBy=n=>activeTeams().find(t=>t.name===n),members=()=>S.team?(teamBy(S.team)?.members||[]):[],rulePoint=k=>Number((teamRules().find(r=>r.key===k)||{}).points||0);
const tpl=t=>({amr:{label:"AMR例會",attendanceOnly:true},night:{label:"夜創",attendKey:"activity_creation_self",friendKey:"activity_creation_friends"},dream:{label:"夢想起飛",attendKey:"activity_creation_self",friendKey:"activity_creation_friends"},soft:{label:"軟性活動",attendKey:"activity_soft_self",friendKey:"activity_soft_friends"}}[t||"amr"]);
const typeName=t=>({amr:"AMR例會",night:"夜創",dream:"夢想起飛",soft:"軟性活動"}[t||"amr"]),typeIcon=t=>({amr:"📅",night:"🌙",dream:"🚀",soft:"🎯"}[t||"amr"]);
const normalize=e=>{let t=tpl(e?.template||"amr");return{...e,attendanceOnly:e?.attendanceOnly??!!t.attendanceOnly,attendKey:e?.attendKey??t.attendKey,friendKey:e?.friendKey??t.friendKey,qrEnabled:e?.qrEnabled??true,allowFriends:e?.allowFriends??!t.attendanceOnly,scoreEnabled:e?.scoreEnabled??!t.attendanceOnly,startTime:e?.startTime||"09:00",endTime:e?.endTime||"09:10",graceMinutes:e?.graceMinutes??5}};
const activeEvent=()=>events().find(e=>e.active)||events()[0],getEvent=id=>events().find(e=>e.id===id),attendPoint=e=>e?.attendanceOnly?0:rulePoint(e.attendKey),friendPoint=e=>e?.attendanceOnly?0:rulePoint(e.friendKey),totalEvent=(e,f=0)=>attendPoint(e)+Number(f)*friendPoint(e);
const calc=(type,vals)=>(type==="team"?teamRules():personalRules()).reduce((a,r)=>a+Number(vals[r.key]||0)*Number(r.points||0),0);
function teamRank(){let o={};activeTeams().forEach(t=>o[t.name]=0);S.records.forEach(r=>{if(r.team&&o[r.team]!==undefined)o[r.team]+=Number(r.totalScore||0)});return Object.entries(o).map(([team,score])=>({team,score})).sort((a,b)=>b.score-a.score)}
function personRank(){let o={};people().forEach(p=>o[p.name]={score:0,team:p.team});S.records.forEach(r=>{if(r.name){if(!o[r.name])o[r.name]={score:0,team:r.team};o[r.name].score+=Number(r.totalScore||0)}});return Object.entries(o).map(([name,d])=>({name,...d})).sort((a,b)=>b.score-a.score)}
const recordId=(e,name)=>`checkin_${e.id}_${name}`,checked=(e,name)=>S.records.find(r=>r.id===recordId(e,name)),attRows=e=>people().map(p=>{let r=checked(e,p.name);return{...p,r,status:r?.attendanceStatus||(r?"present":"absent")}}),attCounts=e=>{let rows=e?attRows(e):[],c=x=>rows.filter(r=>r.status===x).length;return{present:c("present"),late:c("late"),leave:c("leave"),absent:c("absent")}};
const late=(e,ts)=>{let st=new Date(`${e.date||todayISO()}T${e.startTime}:00`).getTime();return ts>st+Number(e.graceMinutes||5)*60000},statusText=x=>x==="present"?"🟢 已到":x==="late"?"🟠 遲到":x==="leave"?"🟡 請假":"🔴 未到";

const dateNum=r=>Number(r.createdAt||0);
function inRange(r,range){
  if(range==="all")return true;
  const d=new Date(dateNum(r)),now=new Date();
  if(range==="week"){const day=now.getDay()||7;const start=new Date(now);start.setDate(now.getDate()-day+1);start.setHours(0,0,0,0);return d>=start}
  if(range==="month")return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
  if(range==="quarter"){const q=Math.floor(now.getMonth()/3),m0=q*3;const start=new Date(now.getFullYear(),m0,1),end=new Date(now.getFullYear(),m0+3,1);return d>=start&&d<end}
  return true;
}
function filteredRecords(range="all"){return S.records.filter(r=>inRange(r,range))}
function teamRankBy(range="all"){let o={};activeTeams().forEach(t=>o[t.name]=0);filteredRecords(range).forEach(r=>{if(r.team&&o[r.team]!==undefined)o[r.team]+=Number(r.totalScore||0)});return Object.entries(o).map(([team,score])=>({team,score})).sort((a,b)=>b.score-a.score)}
function personRankBy(range="all"){let o={};people().forEach(p=>o[p.name]={score:0,team:p.team});filteredRecords(range).forEach(r=>{if(r.name){if(!o[r.name])o[r.name]={score:0,team:r.team};o[r.name].score+=Number(r.totalScore||0)}});return Object.entries(o).map(([name,d])=>({name,...d})).sort((a,b)=>b.score-a.score)}
function leaveCount(name,month=(todayISO().slice(0,7))){return S.records.filter(r=>r.recordType==="attendance"&&r.attendanceStatus==="leave"&&r.name===name&&String(r.eventDate||"").startsWith(month)).length}

function loadScript(src){
  return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})
}
async function ensureXLSX(){
  if(window.XLSX)return window.XLSX;
  await loadScript("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js");
  return window.XLSX;
}
async function excelDownload(filename,sheets){
  const XLSX=await ensureXLSX();
  const wb=XLSX.utils.book_new();
  for(const [name,rows] of Object.entries(sheets)){
    const ws=XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));
  }
  XLSX.writeFile(wb,filename);
}
function allRowsForExport(){
  return [["日期","隊伍","姓名","項目","分數","新朋友","活動","狀態"],...S.records.map(r=>[new Date(r.createdAt||0).toLocaleString(),r.team||"",r.name||"",r.note||"",r.totalScore||0,r.friends||0,r.eventName||"",r.attendanceStatus||""])];
}
function teamRowsForExport(range="all"){
  return [["排名","隊伍","分數"],...teamRankBy(range).map((r,i)=>[i+1,r.team,r.score])];
}
function personRowsForExport(range="all"){
  return [["排名","姓名","隊伍","分數"],...personRankBy(range).map((r,i)=>[i+1,r.name,r.team,r.score])];
}
function attendanceRowsForExport(){
  return [["日期","活動","隊伍","姓名","狀態"],...S.records.filter(r=>r.recordType==="attendance").map(r=>[new Date(r.createdAt||0).toLocaleString(),r.eventName||"",r.team||"",r.name||"",r.attendanceStatus||""])]
}
function friendsRowsForExport(){
  const map={};
  S.records.forEach(r=>{if(r.name){map[r.name]=map[r.name]||{name:r.name,team:r.team||"",friends:0};map[r.name].friends+=Number(r.friends||0)}});
  return [["姓名","隊伍","新朋友人數"],...Object.values(map).sort((a,b)=>b.friends-a.friends).map(x=>[x.name,x.team,x.friends])];
}
function activityRowsForExport(){
  return [["活動","日期","類型","開始","結束","QR","是否加分","是否可填新朋友"],...events().map(e=>[e.name||"",e.date||"",typeName(e.template),e.startTime||"",e.endTime||"",e.qrEnabled?"啟用":"關閉",e.scoreEnabled?"是":"否",e.allowFriends?"是":"否"])]
}
async function exportAllExcel(){
  await excelDownload("AMR_Team_完整報表.xlsx",{
    "積分紀錄":allRowsForExport(),
    "團隊排行":teamRowsForExport(S.rankRange||"all"),
    "個人排行":personRowsForExport(S.rankRange||"all"),
    "AMR出席":attendanceRowsForExport(),
    "新朋友統計":friendsRowsForExport(),
    "活動統計":activityRowsForExport()
  });
}
function makeBarChart(rows){
  const max=Math.max(1,...rows.map(r=>Number(r.score||0)));
  return `<div class="reportChart">${rows.slice(0,8).map(r=>`<div class="bar" style="height:${Math.max(8,Number(r.score||0)/max*100)}%"><span>${r.team||r.name}<br>${r.score}</span></div>`).join("")}</div>`;
}
let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;});
window.installApp=async()=>{if(!deferredInstallPrompt)return toast("請用 Safari/Chrome 的「加入主畫面」安裝");deferredInstallPrompt.prompt();deferredInstallPrompt=null}

function csvDownload(filename,rows){
  const csv=rows.map(row=>row.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")).join("\n");
  let a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=filename;a.click()
}

function eventStatus(e){e=normalize(e);let n=nowHM();if(!e.qrEnabled)return{ok:false,msg:"QR 已關閉"};if(e.startTime&&n<e.startTime)return{ok:false,msg:`尚未開放：${e.startTime}`};if(e.endTime&&n>e.endTime)return{ok:false,msg:`已截止：${e.endTime}`};return{ok:true,msg:"可簽到"}}
function nav(){document.getElementById("nav").innerHTML=[["home","🏠","首頁"],["score","🏆","積分"],["activity","▣","QR"],["rank","👑","排行"],["admin","⚙️","管理"]].map(x=>`<button class="${S.page===x[0]?"on":""}" onclick="go('${x[0]}')"><span>${x[1]}</span>${x[2]}</button>`).join("")}
function cover(){return`<section class="hero"><div class="heroIn"><div class="amr">AMR</div><h1>人力特攻隊</h1><p>${C().settings.subtitle}</p><div class="topNav">${[["home","首頁"],["score","積分"],["activity","QR簽到"],["rank","排行榜"],["admin","管理"]].map(x=>`<button class="${S.page===x[0]?"on":""}" onclick="go('${x[0]}')">${x[1]}</button>`).join("")}</div></div></section>`}
function shell(b){app.innerHTML=cover()+b;nav()} window.go=p=>{S.page=p;render()}
const rows=(arr,type)=>arr.map((r,i)=>`<div class="row"><div class="medal ${i==0?"one":i==1?"two":i==2?"three":""}">${i+1}</div><div><div class="name">${type==="team"?r.team:r.name}</div><div class="muted">${type==="team"?"團隊":r.team}</div></div><div class="score">${r.score}</div></div>`).join("")||`<div class="muted">尚無資料</div>`;

function home(){let tr=teamRank(),pr=personRank(),a=attCounts(activeEvent()),today=S.records.filter(r=>new Date(r.createdAt||0).toDateString()===new Date().toDateString()),friends=S.records.reduce((n,r)=>n+Number(r.friends||0),0);shell(`<div class="quick"><button class="btn" onclick="go('score')"><span>＋</span>新增積分</button><button class="btn" onclick="go('activity')"><span>▣</span>建立 QR</button><button class="btn" onclick="go('rank')"><span>👑</span>排行榜</button><button class="btn" onclick="go('admin')"><span>⚙️</span>管理中心</button></div><div class="appInstall"><b>📱 AMR App</b><div class="muted">可加入手機主畫面使用。iPhone 請用 Safari 分享 → 加入主畫面。</div><button class="btn small primary" onclick="installApp()" style="margin-top:8px">安裝 / 加入主畫面</button></div><section class="war"><div class="warItem">目前冠軍<b>${tr[0]?.team||"尚無"}</b></div><div class="warItem">本期 MVP<b>${pr[0]?.name||"尚無"}</b></div><div class="warItem">今日新增<b>${today.length} 筆</b></div><div class="warItem">新朋友<b>${friends} 位</b></div></section><section class="card champion"><div class="cup">🏆</div><div class="bigName">${tr[0]?.team||"尚無資料"}</div><div class="bigScore">${tr[0]?.score||0}<small> 分</small></div></section><div class="grid2"><section class="card"><h2>AMR 出席</h2><div class="grid2"><div>✅ 已到 <b>${a.present}</b></div><div>🕘 遲到 <b>${a.late}</b></div><div>📋 請假 <b>${a.leave}</b></div><div>❌ 未到 <b>${a.absent}</b></div></div></section><section class="card"><h2>MVP</h2><div class="bigName">${pr[0]?.name||"尚無"}</div><div class="bigScore" style="font-size:42px">${pr[0]?.score||0}</div></section></div><div class="grid2"><section class="card"><h2>團隊前三名</h2>${rows(tr.slice(0,3),"team")}</section><section class="card"><h2>個人排行榜</h2>${rows(pr.slice(0,5),"person")}</section></div><section class="card"><h2>最新活動</h2>${S.records.slice(0,5).map(r=>`<div class="row"><div class="medal">＋</div><div><div class="name">${r.name||""}</div><div class="muted">${r.note||""}｜${r.team||""}</div></div><div class="score">${r.totalScore||0}</div></div>`).join("")||"尚無紀錄"}</section>`)}
function score(){let rules=S.type==="team"?teamRules():personalRules();shell(`<section class="card"><h2>積分中心</h2><div class="tabs"><button class="tab ${S.type==="team"?"on":""}" onclick="setType('team')">團隊積分</button><button class="tab ${S.type==="personal"?"on":""}" onclick="setType('personal')">個人積分</button></div>${personFields()}${rules.map(r=>`<div class="item"><div><div class="name">${r.label}</div><div class="muted">+${r.points} 分 / ${r.unit}</div></div><div class="ctrl"><button onclick="dec('${r.key}')">−</button><div class="num">${S.vals[r.key]||0}</div><button onclick="inc('${r.key}')">＋</button></div></div>`).join("")}<div class="total"><span>本次得分</span><b>${calc(S.type,S.vals)}</b></div><button class="btn primary" style="width:100%" onclick="saveScore()">送出</button></section>`)}
function personFields(){return`<label class="field"><span>隊伍</span><select onchange="S.team=this.value;S.name='';render()"><option value="">請選擇</option>${activeTeams().map(t=>`<option ${S.team===t.name?"selected":""}>${t.name}</option>`).join("")}</select></label><label class="field"><span>姓名</span><select ${S.team?"":"disabled"} onchange="S.name=this.value"><option value="">請選擇</option>${members().map(m=>`<option ${S.name===m?"selected":""}>${m}</option>`).join("")}</select></label>`}
window.setType=t=>{S.type=t;S.vals={};render()};window.inc=k=>{S.vals[k]=Number(S.vals[k]||0)+1;render()};window.dec=k=>{S.vals[k]=Math.max(0,Number(S.vals[k]||0)-1);render()}
window.saveScore=async()=>{if(!S.team||!S.name)return toast("請選隊伍與姓名");let total=calc(S.type,S.vals);if(total<=0)return toast("請新增分數");await setDoc(doc(db,"team_scores",`score_${Date.now()}`),{...S.vals,team:S.team,name:S.name,recordType:S.type,totalScore:total,note:"手動加分",createdAt:Date.now()});S.vals={};toast("新增成功");go("home")}

function activity(){let ev=activeEvent(),url=ev?location.origin+location.pathname+"?page=checkin&event="+ev.id:"",qr=ev?`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(url)}`:"";shell(`<section class="card"><h2>活動管理</h2><div class="adminActions"><button class="btn primary" onclick="openScanner()">開啟 QR 掃描器</button><button class="btn" onclick="installApp()">安裝成 App</button></div><div class="grid2"><button class="btn blue" onclick="quickEvent('amr')">AMR</button><button class="btn" onclick="quickEvent('night')">夜創</button><button class="btn green" onclick="quickEvent('dream')">夢想起飛</button><button class="btn purple" onclick="quickEvent('soft')">軟性活動</button></div></section><section class="card"><h2>活動列表</h2><div class="list">${events().map(e=>activityCard(normalize(e))).join("")||"尚無活動"}</div></section>${ev?`<section class="card"><h2>目前 QR｜${ev.name}</h2><div class="qr"><img src="${qr}"><br><button class="btn primary" onclick="copyText('${url}')">複製 QR 連結</button></div></section><section class="card"><h2>簽到名單</h2>${attRows(ev).map(r=>`<div class="row"><div></div><div><div class="name">${r.name}</div><div class="muted">${r.team}</div></div><div class="score" style="font-size:14px">${statusText(r.status)}</div></div>`).join("")}</section>`:""}`)}
function activityCard(e){return`<div class="listCard"><div class="listHead"><div><div class="name">${typeIcon(e.template)} ${e.name}</div><div class="muted">${typeName(e.template)}｜${e.date}｜${e.startTime}-${e.endTime}｜${e.attendanceOnly?"不加分":`出席+${attendPoint(e)} 新朋友+${friendPoint(e)}`}</div><div style="margin-top:6px"><span class="pill">${e.active?"目前使用":"待用"}</span><span class="pill">${e.qrEnabled?"QR啟用":"QR關閉"}</span></div></div></div><div class="actions"><button class="btn small primary" onclick="setActive('${e.id}')">設為目前</button><button class="btn small" onclick="copyEvent('${e.id}')">複製</button><button class="btn small red" onclick="deleteEvent('${e.id}')">刪除</button></div></div>`}
window.quickEvent=async type=>{let d=new Date(),t=tpl(type),name=prompt("活動名稱",`${d.getMonth()+1}/${d.getDate()} ${t.label}`);if(!name)return;let cfg=structuredClone(C());cfg.events=(cfg.events||[]).map(e=>({...e,active:false}));cfg.events.push({id:uid("event"),template:type,name,date:todayISO(),startTime:"09:00",endTime:"09:10",graceMinutes:5,qrEnabled:true,attendanceOnly:!!t.attendanceOnly,scoreEnabled:!t.attendanceOnly,allowFriends:!t.attendanceOnly,attendKey:t.attendKey,friendKey:t.friendKey,active:true});await setDoc(doc(db,"platform","settings"),cfg);toast("已建立活動")}
window.setActive=async id=>{let cfg=structuredClone(C());cfg.events=events().map(e=>({...e,active:e.id===id}));await setDoc(doc(db,"platform","settings"),cfg)}
window.copyEvent=async id=>{let e=normalize(getEvent(id));let cfg=structuredClone(C());cfg.events=events().map(x=>({...x,active:false}));cfg.events.push({...e,id:uid("event"),name:e.name+"（複製）",date:todayISO(),active:true});await setDoc(doc(db,"platform","settings"),cfg)}
window.deleteEvent=async id=>{if(!confirm("刪除活動？"))return;let cfg=structuredClone(C());cfg.events=events().filter(e=>e.id!==id);await setDoc(doc(db,"platform","settings"),cfg)}
window.copyText=async x=>{await navigator.clipboard.writeText(x);toast("已複製")}

function checkin(){let ev=normalize(getEvent(new URLSearchParams(location.search).get("event"))||activeEvent());if(!ev)return shell(`<section class="card">活動不存在</section>`);let st=eventStatus(ev);shell(`<section class="card"><h2>${ev.name}</h2><p class="muted">${ev.attendanceOnly?"AMR只簽到不加分":`出席+${attendPoint(ev)}｜新朋友+${friendPoint(ev)}/人`}｜有效 ${ev.startTime}-${ev.endTime}</p>${!st.ok?`<div class="card">${st.msg}</div>`:`${personFields()}${!ev.attendanceOnly&&ev.allowFriends?`<div class="item"><div><div class="name">今天帶幾位新朋友？</div><div class="muted">依積分設定自動計算</div></div><div class="ctrl"><button onclick="friend(-1)">−</button><div class="num">${S.vals.friends||0}</div><button onclick="friend(1)">＋</button></div></div><div class="total"><span>本次加分</span><b>${totalEvent(ev,S.vals.friends||0)}</b></div>`:""}<button class="btn primary" style="width:100%" onclick="doCheckin('${ev.id}')">完成簽到</button>`}</section>`)}
window.friend=n=>{S.vals.friends=Math.max(0,Number(S.vals.friends||0)+n);render()}
window.doCheckin=async id=>{let ev=normalize(getEvent(id));if(!ev||!S.team||!S.name)return toast("請選隊伍與姓名");let st=eventStatus(ev);if(!st.ok)return toast(st.msg);let rid=recordId(ev,S.name);if(S.records.some(r=>r.id===rid))return toast("已完成本場簽到");let now=Date.now(),friends=ev.allowFriends?Number(S.vals.friends||0):0,isLate=ev.attendanceOnly&&late(ev,now),total=(!ev.attendanceOnly&&ev.scoreEnabled)?totalEvent(ev,friends):0;await setDoc(doc(db,"team_scores",rid),{eventId:ev.id,eventName:ev.name,eventDate:ev.date,template:ev.template,team:S.team,name:S.name,recordType:ev.attendanceOnly?"attendance":"personal",attendanceStatus:ev.attendanceOnly?(isLate?"late":"present"):"present",friends,totalScore:total,note:ev.attendanceOnly?`${ev.name}${isLate?" 遲到":" 簽到"}`:`${ev.name} 出席${friends?`｜新朋友${friends}位`:""}`,createdAt:now});S.vals={};shell(`<section class="success"><div class="ok">✅</div><div class="okName">${S.name}</div><div>${ev.attendanceOnly?"簽到成功":"完成加分"}</div><div class="okScore">${total>0?`+${total}`:"完成"}</div><button class="btn primary" onclick="go('home')">回首頁</button></section>`)}

let scanStream=null,scanTimer=null;
window.openScanner=async()=>{
  shell(`<section class="card"><h2>QR 掃描器</h2><div class="scanBox"><video id="scannerVideo" autoplay playsinline></video><div class="scanHint">請將 QR Code 對準畫面中央</div><div class="adminActions"><button class="btn red" onclick="closeScanner()">停止掃描</button><button class="btn" onclick="manualQR()">手動貼上連結</button></div></div></section>`);
  try{
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    const video=document.getElementById("scannerVideo");video.srcObject=scanStream;await video.play();
    if("BarcodeDetector" in window){
      const detector=new BarcodeDetector({formats:["qr_code"]});
      scanTimer=setInterval(async()=>{try{const codes=await detector.detect(video);if(codes&&codes.length){handleScan(codes[0].rawValue)}}catch(e){}},900);
    }else{
      document.querySelector(".scanHint").innerHTML="此瀏覽器不支援內建掃描器，請使用手機相機掃 QR，或按「手動貼上連結」。";
    }
  }catch(e){toast("無法開啟相機");manualQR();}
}
window.closeScanner=()=>{if(scanTimer)clearInterval(scanTimer);scanTimer=null;if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}go("activity")}
window.manualQR=()=>{const v=prompt("貼上 QR 連結");if(v)handleScan(v)}
window.handleScan=url=>{
  try{
    closeScanner();
    const u=new URL(url,location.href);
    const eventId=u.searchParams.get("event");
    if(!eventId)return toast("不是有效的 AMR QR");
    S.page="checkin";
    history.replaceState(null,"",location.pathname+"?page=checkin&event="+eventId);
    render();
  }catch(e){toast("QR 格式錯誤")}
}

function rank(){
const range=S.rankRange||"all", tr=teamRankBy(range), pr=personRankBy(range), rec=filteredRecords(range);
shell(`<section class="card"><h2>排行榜</h2><div class="filterBar">${[["all","全部"],["week","本週"],["month","本月"],["quarter","本季"]].map(x=>`<button class="tab ${range===x[0]?"on":""}" onclick="setRankRange('${x[0]}')">${x[1]}</button>`).join("")}</div></section><section class="card"><h2>團隊排行</h2>${rows(tr,"team")}</section><section class="card"><h2>個人排行</h2>${rows(pr,"person")}</section><section class="card"><h2>報表匯出</h2><div class="reportGrid"><div class="reportBox">紀錄數<b>${rec.length}</b></div><div class="reportBox">總積分<b>${rec.reduce((n,r)=>n+Number(r.totalScore||0),0)}</b></div><div class="reportBox">新朋友<b>${rec.reduce((n,r)=>n+Number(r.friends||0),0)}</b></div><div class="reportBox">出席紀錄<b>${rec.filter(r=>r.recordType==="attendance").length}</b></div></div><div class="adminActions"><button class="btn primary" onclick="exportCSV()">匯出目前範圍 CSV</button><button class="btn" onclick="exportAttendanceCSV()">匯出 AMR 出席</button></div></section>`)
}
window.setRankRange=r=>{S.rankRange=r;render()}
window.exportCSV=()=>{let rec=filteredRecords(S.rankRange||"all");csvDownload("amr_records.csv",[["日期","隊伍","姓名","項目","分數","新朋友","活動","狀態"],...rec.map(r=>[new Date(r.createdAt||0).toLocaleString(),r.team||"",r.name||"",r.note||"",r.totalScore||0,r.friends||0,r.eventName||"",r.attendanceStatus||""])])}
window.exportAttendanceCSV=()=>{let rec=S.records.filter(r=>r.recordType==="attendance");csvDownload("amr_attendance.csv",[["日期","活動","隊伍","姓名","狀態"],...rec.map(r=>[new Date(r.createdAt||0).toLocaleString(),r.eventName||"",r.team||"",r.name||"",r.attendanceStatus||""])])}

function admin(){
if(!S.adminMode)return shell(`<section class="card"><h2>管理員登入</h2><label class="field"><span>管理密碼</span><input id="pin" type="password" placeholder="輸入管理密碼"></label><button class="btn primary" onclick="loginAdmin()">登入</button></section>`);
shell(`<section class="card"><h2>管理中心</h2><div class="tabs"><button class="tab ${S.admin==="events"?"on":""}" onclick="adminTab('events')">活動</button><button class="tab ${S.admin==="teams"?"on":""}" onclick="adminTab('teams')">隊伍成員</button><button class="tab ${S.admin==="points"?"on":""}" onclick="adminTab('points')">積分</button><button class="tab ${S.admin==="reports"?"on":""}" onclick="adminTab('reports')">報表</button><button class="tab ${S.admin==="settings"?"on":""}" onclick="adminTab('settings')">設定</button><button class="tab" onclick="logoutAdmin()">登出</button></div><div id="adminBox" class="adminPanel"></div></section>`);adminTab(S.admin)}
window.loginAdmin=()=>{if(document.getElementById("pin").value===(C().settings.adminPin||"465")){localStorage.setItem("amrAdmin","1");S.adminMode=true;toast("登入成功");render()}else toast("密碼錯誤")}
window.logoutAdmin=()=>{localStorage.removeItem("amrAdmin");S.adminMode=false;render()}
window.adminTab=t=>{
S.admin=t;let box=document.getElementById("adminBox");if(!box)return;
if(t==="events")return box.innerHTML=`<p class="muted">活動管理請到 QR 頁操作。</p><button class="btn primary" onclick="go('activity')">前往活動管理</button>`;
if(t==="teams"){
  const q=S.memberSearch||"";
  box.innerHTML=`<label class="field searchBox"><span>搜尋成員</span><input value="${q}" oninput="S.memberSearch=this.value;adminTab('teams')" placeholder="輸入姓名"></label><label class="field"><span>新增隊伍</span><input id="newTeam"></label><button class="btn primary" onclick="addTeam()">新增隊伍</button><div class="adminActions"><button class="btn" onclick="exportMembers()">匯出成員</button><button class="btn red" onclick="resetSeason()">開始新一期（清空積分紀錄）</button></div>${activeTeams().map((team,i)=>`<section class="card"><h2>${team.name}</h2><input id="tn${i}" value="${team.name}"><div class="adminActions"><button class="btn small" onclick="renameTeam(${i})">改名</button><button class="btn small red" onclick="disableTeam(${i})">停用隊伍</button></div><div class="tableLike">${team.members.filter(m=>!q||m.includes(q)).map((m,j)=>`<div class="memberRow"><div><div class="name">${m}</div><div class="muted">${team.name}</div></div><div class="memberTools"><button class="btn small" onclick="renameMember(${i},${j})">改名</button><button class="btn small blue" onclick="moveMember(${i},${j})">換隊</button><button class="btn small red" onclick="delMem(${i},${j})">刪除</button></div></div>`).join("")||`<div class="empty">此隊無符合成員</div>`}</div><label class="field"><span>新增成員</span><input id="mem${i}"></label><button class="btn blue" onclick="addMem(${i})">新增成員</button></section>`).join("")}`;
  return;
}
if(t==="points")return box.innerHTML=`<h3>團隊積分</h3>${teamRules().map((r,i)=>`<label class="field"><span>${r.label}</span><input type="number" value="${r.points}" onchange="savePoint('team',${i},this.value)"></label>`).join("")}<h3>個人積分</h3>${personalRules().map((r,i)=>`<label class="field"><span>${r.label}</span><input type="number" value="${r.points}" onchange="savePoint('personal',${i},this.value)"></label>`).join("")}`;
if(t==="reports")return box.innerHTML=`<div class="reportGrid"><div class="reportBox">總紀錄<b>${S.records.length}</b></div><div class="reportBox">總積分<b>${S.records.reduce((n,r)=>n+Number(r.totalScore||0),0)}</b></div><div class="reportBox">新朋友<b>${S.records.reduce((n,r)=>n+Number(r.friends||0),0)}</b></div><div class="reportBox">AMR紀錄<b>${S.records.filter(r=>r.recordType==="attendance").length}</b></div></div><div class="adminActions"><button class="btn primary" onclick="exportAllExcel()">匯出完整 Excel</button><button class="btn" onclick="exportCSV()">匯出積分 CSV</button><button class="btn" onclick="exportAttendanceCSV()">匯出出席 CSV</button></div>${makeBarChart(teamRankBy("all"))}`;
if(t==="settings")return box.innerHTML=`<label class="field"><span>系統名稱</span><input id="setTitle" value="${C().settings.title||""}"></label><label class="field"><span>副標語</span><input id="setSub" value="${C().settings.subtitle||""}"></label><label class="field"><span>管理密碼</span><input id="setPin" value="${C().settings.adminPin||"465"}"></label><button class="btn primary" onclick="saveSettings()">儲存設定</button>`;
}
window.addTeam=async()=>{let v=document.getElementById("newTeam").value.trim();if(!v)return;let cfg=structuredClone(C());cfg.teams.push({id:uid("team"),name:v,active:true,members:[]});await setDoc(doc(db,"platform","settings"),cfg)}
window.renameTeam=async i=>{let cfg=structuredClone(C());cfg.teams[i].name=document.getElementById("tn"+i).value.trim();await setDoc(doc(db,"platform","settings"),cfg)}
window.disableTeam=async i=>{if(!confirm("停用這個隊伍？"))return;let cfg=structuredClone(C());cfg.teams[i].active=false;await setDoc(doc(db,"platform","settings"),cfg)}
window.addMem=async i=>{let v=document.getElementById("mem"+i).value.trim();if(!v)return;let cfg=structuredClone(C());cfg.teams[i].members.push(v);await setDoc(doc(db,"platform","settings"),cfg)}
window.delMem=async(i,j)=>{if(!confirm("刪除此成員？"))return;let cfg=structuredClone(C());cfg.teams[i].members.splice(j,1);await setDoc(doc(db,"platform","settings"),cfg)}
window.renameMember=async(i,j)=>{let cfg=structuredClone(C());let v=prompt("新姓名",cfg.teams[i].members[j]);if(!v)return;cfg.teams[i].members[j]=v;await setDoc(doc(db,"platform","settings"),cfg)}
window.moveMember=async(i,j)=>{let cfg=structuredClone(C());let name=cfg.teams[i].members[j];let target=prompt("要移到哪個隊伍？\\n"+cfg.teams.map(t=>t.name).join("\\n"));let k=cfg.teams.findIndex(t=>t.name===target);if(k<0)return toast("找不到隊伍");cfg.teams[i].members.splice(j,1);cfg.teams[k].members.push(name);await setDoc(doc(db,"platform","settings"),cfg)}
window.savePoint=async(t,i,v)=>{let cfg=structuredClone(C());(t==="team"?cfg.teamRules:cfg.personalRules)[i].points=Number(v||0);await setDoc(doc(db,"platform","settings"),cfg);toast("已儲存")}
window.saveSettings=async()=>{let cfg=structuredClone(C());cfg.settings={...(cfg.settings||{}),title:document.getElementById("setTitle").value,subtitle:document.getElementById("setSub").value,adminPin:document.getElementById("setPin").value};await setDoc(doc(db,"platform","settings"),cfg);toast("已儲存")}
window.exportMembers=()=>csvDownload("amr_members.csv",[["隊伍","姓名"],...activeTeams().flatMap(t=>t.members.map(m=>[t.name,m]))])
window.resetSeason=async()=>{if(!confirm("確定清空所有積分與簽到紀錄？建議先匯出 CSV。"))return;await Promise.all(S.records.map(r=>deleteDoc(doc(db,"team_scores",r.id))));toast("已開始新一期")}

function render(){if(S.page==="home")home();else if(S.page==="score")score();else if(S.page==="activity")activity();else if(S.page==="rank")rank();else if(S.page==="admin")admin();else if(S.page==="checkin")checkin()}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}
await signInAnonymously(auth);
onSnapshot(doc(db,"platform","settings"),async snap=>{if(!snap.exists()){await setDoc(doc(db,"platform","settings"),DEFAULT);S.cfg=DEFAULT}else S.cfg=snap.data();render()});
onSnapshot(collection(db,"team_scores"),snap=>{S.records=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));render()});

if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}
