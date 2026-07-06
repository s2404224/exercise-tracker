import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, deleteField, getDoc, onSnapshot, enableIndexedDbPersistence }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FB } from './constants.js';
import { S } from './state.js';
import { fmt, defaultMembers, isEmptyData } from './helpers.js';
import { hideLoad, showPage, setSdot, renderApp, renderLogin, toast, closeAll } from './ui.js';

const CACHE_KEY='exerciseTrackerCache';

// 先從 localStorage 讀取上次的資料並立即畫面呈現，不必等網路回應，
// 讓重複造訪時幾乎是「秒開」；等 onSnapshot 真正回應後會再覆寫成最新資料。
function loadCache(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw) return false;
    const cached=JSON.parse(raw);
    S.D = cached.D || S.D;
    hideLoad();
    if(!S.me){ showPage('login'); renderLogin(); } else renderApp();
    return true;
  }catch(e){ return false; }
}
function saveCache(){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({D:S.D, ts:Date.now()})); }catch(e){/* ignore quota errors */}
}

// ── FIREBASE ────────────────────────────
const configured = FB.apiKey !== "YOUR_API_KEY";

export function initFB(){
  if(!configured){
    hideLoad(); showPage('login');
    S.D.members=defaultMembers();
    renderLogin();
    return;
  }
  const hadCache=loadCache();
  const app=initializeApp(FB);
  S.fsdb=getFirestore(app);
  enableIndexedDbPersistence(S.fsdb).catch(()=>{/* multiple tabs open or unsupported browser — safe to ignore */});
  const ref=doc(S.fsdb,'exercise','shared');
  // 連線監看：超過 8 秒還沒收到第一筆資料就提示，避免無限轉圈讓人以為當機
  const watchdog=setTimeout(()=>{
    if(!S.firstLoadDone){
      const lt=document.getElementById('ldtxt');
      if(lt) lt.innerHTML='連線較慢，仍在嘗試…<br><span style="font-size:11px;color:var(--t3)">若持續無法載入，請檢查網路後重新整理</span>';
    }
  },8000);
  onSnapshot(ref, snap=>{
    clearTimeout(watchdog);
    setSdot('live');
    if(snap.exists()){
      const d=snap.data();
      const incoming = (d.members&&d.members.length>0) ? d.members : defaultMembers();
      // preserve structure, ensure pin field exists
      S.D.members = incoming.map(m=>({pin:'',...m}));
      S.D.checkins = d.checkins  || {};
      S.D.leaves   = d.leaves    || {};
      S.D.payments = d.payments  || {};
      S.firstLoadDone = true;
    } else if(!S.firstLoadDone){
      // 只有「真正第一次使用、從未寫入過」才初始化預設資料
      // 絕不在資料讀取異常時自動覆寫，避免清空真實紀錄
      S.D.members=defaultMembers(); S.D.checkins={}; S.D.leaves={}; S.D.payments={};
      S.firstLoadDone = true;
      push();
    }
    // 若文件不存在但 firstLoadDone 已是 true，代表讀取異常，保留現有記憶體資料、不寫入，避免覆蓋
    saveCache();
    hideLoad();
    if(!S.me){ showPage('login'); renderLogin(); }
    else renderApp();
    maybeDailyBackup(); // 每日自動備份（每天第一次開啟時觸發）
  }, err=>{
    clearTimeout(watchdog);
    setSdot('err'); console.error(err);
    // 連線錯誤時不要卡在載入畫面：若已載過資料就維持畫面，否則顯示錯誤提示與重新整理
    if(S.firstLoadDone||hadCache){ toast('連線錯誤，資料未變更'); }
    else{
      const lt=document.getElementById('ldtxt');
      if(lt) lt.innerHTML='連線失敗，請檢查網路<br><span style="font-size:11px;color:var(--t3)">點此重新整理</span>';
      const ld=document.getElementById('loading'); if(ld) ld.style.cursor='pointer', ld.onclick=()=>location.reload();
    }
  });
  // 跨午夜仍開著的裝置：每 30 分鐘檢查一次，日期換天就自動備份
  setInterval(maybeDailyBackup, 30*60*1000);
}

// ── 每日自動備份 ──────────────────────────
// 由於是純前端網頁，無法保證 00:00 準時執行；改為「每天第一個開啟 App 的人」
// 自動把當天資料存到雲端 exercise/dailyBackups（保留最近 7 天），達到每日一份快照。
async function maybeDailyBackup(){
  const today=fmt(new Date());
  if(S.dailyDoneFor===today) return;          // 今天已備份過，避免重複讀寫
  if(!S.fsdb||!S.firstLoadDone) return;
  if(isEmptyData(S.D.checkins,S.D.leaves)) return; // 空資料不備份，避免覆蓋
  try{
    const ref=doc(S.fsdb,'exercise','dailyBackups');
    const snap=await getDoc(ref);
    const days=(snap.exists()&&snap.data().days)||{};
    if(!days[today]){
      days[today]={members:S.D.members,checkins:S.D.checkins,leaves:S.D.leaves,payments:S.D.payments};
      const keys=Object.keys(days).sort();
      while(keys.length>7) delete days[keys.shift()]; // 只保留最近 7 天
      await setDoc(ref,{days,ts:Date.now()});
      console.log('每日備份完成',today);
    }
    S.dailyDoneFor=today;
  }catch(e){ console.error('每日備份失敗',e); }
}

const sref=()=>doc(S.fsdb,'exercise','shared');

// 整份寫入：僅用於初次建立文件與從備份還原（會覆寫整份）
export async function push(){
  if(!S.fsdb) return;
  await setDoc(sref(),{members:S.D.members,checkins:S.D.checkins,leaves:S.D.leaves,payments:S.D.payments,ts:Date.now()});
}

// 欄位級寫入：只更新指定欄位路徑（例如 checkins.u3.2026-07-01），避免整份覆寫造成多人互相蓋掉。
// updates 為 { '欄位路徑': 值 或 deleteField() }，會自動補上 ts。
export async function fset(updates){
  if(!S.fsdb) return;
  try{
    await updateDoc(sref(),{...updates,ts:Date.now()});
  }catch(e){
    // 文件尚不存在等極少數情況 → 退回整份寫入以建立文件
    console.error('欄位寫入失敗，改用整份寫入建立文件',e);
    await push();
  }
}

// 一鍵下載目前所有資料為 JSON 檔（唯讀，不影響雲端）
export function downloadBackup(){
  const data={members:S.D.members,checkins:S.D.checkins,leaves:S.D.leaves,payments:S.D.payments,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='checkin_backup_'+fmt(new Date())+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('已下載備份 ✓');
}

export async function restoreFromBackup(){
  if(!S.fsdb) return;
  if(!confirm('確定要從最近一次備份還原資料嗎？這會覆蓋目前所有打卡與請假紀錄。')) return;
  try{
    // 從「即時備份」與「每日備份（最近 7 天）」中挑出最新且非空的一份還原
    let best=null;
    const bk=await getDoc(doc(S.fsdb,'exercise','backup'));
    if(bk.exists()&&!isEmptyData(bk.data().checkins,bk.data().leaves)) best={d:bk.data(),ts:bk.data().ts||0};
    const db=await getDoc(doc(S.fsdb,'exercise','dailyBackups'));
    if(db.exists()&&db.data().days){
      const days=db.data().days;
      Object.keys(days).forEach(k=>{
        const dd=days[k];
        if(!isEmptyData(dd.checkins,dd.leaves)){
          const ts=new Date(k+'T23:59:59').getTime();
          if(!best||ts>best.ts) best={d:dd,ts};
        }
      });
    }
    if(!best){ toast('找不到可用的備份'); return; }
    const d=best.d;
    S.D.members  = d.members  || S.D.members;
    S.D.checkins = d.checkins || {};
    S.D.leaves   = d.leaves   || {};
    S.D.payments = d.payments || {};
    await setDoc(doc(S.fsdb,'exercise','shared'),{members:S.D.members,checkins:S.D.checkins,leaves:S.D.leaves,payments:S.D.payments,ts:Date.now()});
    closeAll(); renderApp();
    toast('已從備份還原 ✓');
  }catch(e){ toast('還原失敗：'+e.message); console.error(e); }
}
