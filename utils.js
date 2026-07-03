export function currentWeek() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.getMonth()+1}/${monday.getDate()} - ${sunday.getMonth()+1}/${sunday.getDate()}`;
}
export function weekOptions() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const base = new Date(today.setDate(diff));
  const weeks = [];
  for (let i=-5;i<=5;i++){ const s=new Date(base); s.setDate(base.getDate()+i*7); const e=new Date(s); e.setDate(s.getDate()+6); weeks.push(`${s.getMonth()+1}/${s.getDate()} - ${e.getMonth()+1}/${e.getDate()}`); }
  return weeks;
}
export const uid = (p="id") => p+"-"+Math.random().toString(36).slice(2,9);
export function formatDate(ts){ if(!ts)return ""; return new Date(ts).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
export function csvDownload(filename, rows){ const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
