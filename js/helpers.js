import { S } from './state.js';
import { WEEK1, PAY, MAX_PAY, NEED, COLORS } from './constants.js';

// ── HELPERS ─────────────────────────────
export const defaultMembers=()=>[];
export const col=i=>COLORS[i%COLORS.length];
export const getM=id=>S.D.members.find(m=>m.id===id);
export const midx=id=>S.D.members.findIndex(m=>m.id===id);
export const pad=n=>String(n).padStart(2,'0');
export const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const fmtS=d=>`${d.getMonth()+1}/${d.getDate()}`;
export const mkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
export const mlabel=mk=>{ const[y,m]=mk.split('-'); return `${y}年${parseInt(m)}月`; };

export function getMon(off){
  const t=new Date(); t.setHours(0,0,0,0);
  const dow=t.getDay(),diff=dow===0?-6:1-dow;
  const m=new Date(t); m.setDate(t.getDate()+diff+off*7);
  return m<WEEK1?new Date(WEEK1):m;
}
export const wkNum=mon=>Math.floor((mon-WEEK1)/(7*86400000));
export const wkDays=mon=>Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
export const wkKey=mon=>fmt(mon);
export function allWeeks(){
  const ws=[],t=new Date(); t.setHours(0,0,0,0);
  let m=new Date(WEEK1);
  while(m<=t){ ws.push(new Date(m)); m=new Date(m); m.setDate(m.getDate()+7); }
  return ws;
}
// 排行榜月份歸屬：6/29 那週(週一在 6 月)歸到 7 月個人排行；個人榜自 7 月起
const LB_W1KEY=fmt(WEEK1);
export const lbMonthKey=mon=> wkKey(mon)===LB_W1KEY ? '2026-07' : mkey(mon);
export function lbMonths(){ return [...new Set(allWeeks().map(lbMonthKey))].sort().filter(mk=>mk>='2026-07'); }

export const isEmptyData=(checkins,leaves)=>
  !(checkins&&Object.keys(checkins).length>0)&&!(leaves&&Object.keys(leaves).length>0);

// ── LEAVE ───────────────────────────────
// leaves[uid][wkKey] = 'personal' | 'sick'
// Personal: 1 per calendar month; Sick: unlimited
export function getLvType(uid,mon){ return S.D.leaves[uid]?.[wkKey(mon)]||null; }
export const isLv=(uid,mon)=>!!getLvType(uid,mon);
export function hasPersonalThisMo(uid,mon){
  const mk=mkey(mon);
  return Object.entries(S.D.leaves[uid]||{}).some(([wk,type])=>type==='personal'&&wk.startsWith(mk)&&wk!==wkKey(mon));
}
export function toggleLv(uid,mon,type,toast){
  if(!S.D.leaves[uid]) S.D.leaves[uid]={};
  const wk=wkKey(mon), cur=getLvType(uid,mon);
  if(cur===type){ delete S.D.leaves[uid][wk]; return true; } // cancel
  if(cur){ delete S.D.leaves[uid][wk]; } // switch type
  if(type==='personal'&&hasPersonalThisMo(uid,mon)){ toast('這個月事假已用完（每月 1 次）'); return false; }
  S.D.leaves[uid][wk]=type; return true;
}

// ── CHECKIN ─────────────────────────────
export const getSt=(uid,dk)=>S.D.checkins[uid]?.[dk]||null;
export function setSt(uid,dk,v){
  if(!S.D.checkins[uid]) S.D.checkins[uid]={};
  if(v) S.D.checkins[uid][dk]=v; else delete S.D.checkins[uid][dk];
}
export const cntCk=(uid,days)=>days.filter(d=>getSt(uid,fmt(d))==='checked').length;

// ── PENALTY ─────────────────────────────
export function pen(uid,mon,days){
  const t=new Date(); t.setHours(0,0,0,0);
  const m=getM(uid),joinWk=m?.joinWk||fmt(WEEK1);
  if(wkKey(mon)<joinWk) return {notJoined:true,onLv:false,ck:0,miss:0,amt:0,ended:t>days[6],isTrial:false};
  const ended=t>days[6],onLv=isLv(uid,mon);
  const isTrial=false;
  if(onLv) return {onLv,ck:cntCk(uid,days),miss:0,amt:0,ended,isTrial};
  const ck=cntCk(uid,days);
  if(ended){ const ms=Math.max(0,NEED-ck); return {onLv,ck,miss:ms,amt:Math.min(ms*PAY,MAX_PAY),ended,isTrial}; }
  const rem=days.filter(d=>d>=t).length;
  const minM=Math.max(0,NEED-(ck+rem)),curM=Math.max(0,NEED-ck);
  return {onLv,ck,miss:curM,minMiss:minM,rem,amt:Math.min(curM*PAY,MAX_PAY),minAmt:Math.min(minM*PAY,MAX_PAY),ended:false,isTrial};
}

// ── PAYMENTS ─────────────────────────────
export const isPaid=(uid,mk)=>!!(S.D.payments[mk]?.[uid]);

// ── ADMIN ────────────────────────────────
export const isAdmin=m=>!!(m&&(m.recorder===true||m.name==='舒章綸'));
