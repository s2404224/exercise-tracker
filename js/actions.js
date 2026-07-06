import { S } from './state.js';
import { SYS_PWD, WEEK1, DAYS } from './constants.js';
import { deleteField } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getM, getMon, wkDays, wkKey, fmt, getSt, setSt, toggleLv, getLvType, isAdmin
} from './helpers.js';
import {
  renderApp, renderLogin, renderLb, closeAll, toast, showPage, showTab,
  openPayment, renderPayList, updatePinDots
} from './ui.js';
import { fset, downloadBackup, restoreFromBackup } from './firebase.js';

export { showTab, closeAll, downloadBackup, restoreFromBackup };

export function doLogin(id){
  if(!getM(id)) return;
  S.me=id;
  showPage('app');
  document.getElementById('tbnm').textContent=getM(S.me).name;
  renderApp();
}
export function doLogout(){ S.me=null; S.wkOff=0; showPage('login'); renderLogin(); }

// ── ACTIONS ──────────────────────────────
export function tapDay(dk){
  const nv=getSt(S.me,dk)?null:'checked';
  setSt(S.me,dk,nv);
  fset({['checkins.'+S.me+'.'+dk]: nv?nv:deleteField()}).then(()=>toast(nv?'✓ 打卡成功':'已清除'));
}
export function openCk(){
  if(document.getElementById('btnck').disabled) return;
  const t=new Date(); t.setHours(0,0,0,0);
  const mon=getMon(S.wkOff),days=wkDays(mon);
  if(getLvType(S.me,mon)){ toast('本週已請假'); return; }
  const past=days.filter(d=>d<=t);
  document.getElementById('ckopts').innerHTML=past.map(d=>{
    const dk=fmt(d),st=getSt(S.me,dk),idx=days.indexOf(d);
    return `<button class="mopt${st==='checked'?' sok':''}" data-date="${dk}" onclick="togCk(this)">${DAYS[idx]} ${d.getDate()}日${st==='checked'?' ✓':''}</button>`;
  }).join('');
  document.getElementById('ovlck').classList.add('on');
}
export function togCk(el){ el.classList.toggle('sok'); const b=el.textContent.replace(' ✓',''); el.textContent=el.classList.contains('sok')?b+' ✓':b; }
export function confirmCk(){
  const updates={};
  document.querySelectorAll('#ckopts .mopt').forEach(el=>{
    const dk=el.dataset.date;
    if(el.classList.contains('sok')){ setSt(S.me,dk,'checked'); updates['checkins.'+S.me+'.'+dk]='checked'; }
    else if(getSt(S.me,dk)==='checked'){ setSt(S.me,dk,null); updates['checkins.'+S.me+'.'+dk]=deleteField(); }
  });
  fset(updates).then(()=>{ closeAll(); renderApp(); toast('已儲存 ✓'); });
}
export function doLeave(type){
  const btnId=type==='personal'?'btnlv-p':'btnlv-s';
  if(document.getElementById(btnId).disabled) return;
  const mon=getMon(S.wkOff), wk=wkKey(mon), cur=getLvType(S.me,mon);
  // If clicking same type = cancel; else set new type
  const was=(cur===type);
  if(toggleLv(S.me,mon,type,toast)){
    const nowType=getLvType(S.me,mon); // null=已取消，否則為目前請假類型
    fset({['leaves.'+S.me+'.'+wk]: nowType?nowType:deleteField()}).then(()=>{
      renderApp();
      if(was) toast('已取消請假');
      else if(type==='personal') toast('📋 事假請假，免罰款（本月已用1次）');
      else toast('🤒 病假請假，免罰款');
    });
  }
}
export function clearToday(){ const t=new Date(); t.setHours(0,0,0,0); const dk=fmt(t); setSt(S.me,dk,null); fset({['checkins.'+S.me+'.'+dk]:deleteField()}).then(()=>{ renderApp(); toast('已清除今日'); }); }
export function chWk(d){ const n=S.wkOff+d; if(n>0||getMon(n)<WEEK1) return; S.wkOff=n; renderApp(); }

// ── SETTINGS ─────────────────────────────
export function openSet(){
  const m=getM(S.me); if(!m) return;
  document.getElementById('set-name').value=m.name;
  document.getElementById('set-pin1').value='';
  document.getElementById('set-pin2').value='';
  // 還原備份僅限系統管理員（舒章綸）
  document.getElementById('set-restore-wrap').style.display=isAdmin(m)?'block':'none';
  document.getElementById('ovlset').classList.add('on');
}
export function setDel(id){ /* unused but kept */ }
export function setAdd(){ /* unused but kept */ }
export function setSave(){
  const m=getM(S.me); if(!m) return;
  const nm=(document.getElementById('set-name').value||'').trim();
  const p1=(document.getElementById('set-pin1').value||'').trim();
  const p2=(document.getElementById('set-pin2').value||'').trim();
  if(!nm){ toast('姓名不能空白'); return; }
  // Validate PIN if user typed anything
  if(p1||p2){
    if(!/^\d{4}$/.test(p1)){ toast('密碼必須是 4 位數字'); return; }
    if(p1!==p2){ toast('兩次密碼不一致'); return; }
    m.pin=p1;
    toast('密碼已更新 🔒');
  } else if(p1===''&&p2===''){
    // Leave empty to clear PIN (no password)
    // Only clear if both fields empty and user didn't type anything
    m.pin=m.pin||''; // keep existing
  }
  m.name=nm;
  fset({members:S.D.members}).then(()=>{
    closeAll();
    document.getElementById('tbnm').textContent=m.name;
    renderApp(); renderLogin();
    toast('設定已儲存 ✓');
  });
}

// ── PIN LOGIC ─────────────────────────────
export function pinKey(k){
  if(k==='cancel'){ closeAll(); S.pinBuf=''; return; }
  if(k==='del'){ S.pinBuf=S.pinBuf.slice(0,-1); updatePinDots(); return; }
  if(S.pinBuf.length>=4) return;
  S.pinBuf+=k; updatePinDots();
  if(S.pinBuf.length===4) setTimeout(checkPin,120);
}
function pinErr(msg){
  document.getElementById('pin-err').textContent=msg;
  for(let i=0;i<4;i++) document.getElementById('pd'+i).classList.add('err');
  setTimeout(()=>{ S.pinBuf=''; updatePinDots(); document.getElementById('pin-err').textContent=''; },800);
}
function checkPin(){
  const m=getM(S.pinTarget); if(!m) return;
  if(S.pinBuf===m.pin){ closeAll(); doLogin(S.pinTarget); }
  else pinErr('密碼錯誤，請再試');
}
// ── NEW MEMBER ────────────────────────────
export function openNewMember(){
  document.getElementById('nm-name').value='';
  document.getElementById('nm-pin').value='';
  document.getElementById('nm-pin2').value='';
  document.getElementById('ovl-newmember').classList.add('on');
  setTimeout(()=>document.getElementById('nm-name').focus(),100);
}
export function reqSysPwd(action){
  S.spBuf=''; S.spAction=action;
  updateSpDots();
  document.getElementById('syspwd-err').textContent='';
  document.getElementById('syspwd-title').textContent=action==='addmember'?'新增成員驗證':action==='manage'?'管理成員驗證':action==='restore'?'還原備份驗證':'刪除成員驗證';
  document.getElementById('syspwd-sub').textContent='請輸入系統密碼（4 位數）';
  document.getElementById('ovl-syspwd').classList.add('on');
}
function updateSpDots(){
  for(let i=0;i<4;i++){
    const d=document.getElementById('sp'+i);
    d.classList.toggle('filled',i<S.spBuf.length);
    d.classList.remove('err');
  }
}
export function spKey(k){
  if(k==='cancel'){ closeAll(); S.spBuf=''; return; }
  if(k==='del'){ S.spBuf=S.spBuf.slice(0,-1); updateSpDots(); return; }
  if(S.spBuf.length>=4) return;
  S.spBuf+=k; updateSpDots();
  if(S.spBuf.length===4) setTimeout(checkSysPwd,120);
}
function checkSysPwd(){
  if(S.spBuf!==SYS_PWD){
    document.getElementById('syspwd-err').textContent='密碼錯誤，請再試';
    for(let i=0;i<4;i++) document.getElementById('sp'+i).classList.add('err');
    setTimeout(()=>{ S.spBuf=''; updateSpDots(); document.getElementById('syspwd-err').textContent=''; },800);
    return;
  }
  // Correct!
  closeAll(); S.spBuf='';
  if(S.spAction==='addmember') openNewMember();
  else if(S.spAction==='manage'){ S.loginManageMode=true; renderLogin(); }
  else if(S.spAction.startsWith('delete:')){
    const uid=S.spAction.split(':')[1];
    deleteMemberData(uid);
  }
  else if(S.spAction.startsWith('payment:')){
    const mk=S.spAction.split(':')[1];
    openPayment(mk);
  }
  else if(S.spAction==='restore') restoreFromBackup();
}

// ── PAYMENTS ─────────────────────────────
export function togglePayment(uid,mk){
  const nowPaid=!(S.D.payments[mk]?.[uid]);
  if(!S.D.payments[mk]) S.D.payments[mk]={};
  if(nowPaid) S.D.payments[mk][uid]=true; else delete S.D.payments[mk][uid];
  fset({['payments.'+mk+'.'+uid]: nowPaid?true:deleteField()});
  renderPayList(mk);
  renderLb();
}
export function reqPayment(mk){
  S.spBuf='';S.spAction='payment:'+mk;
  updateSpDots();
  document.getElementById('syspwd-err').textContent='';
  document.getElementById('syspwd-title').textContent='繳款記錄驗證';
  document.getElementById('syspwd-sub').textContent='請輸入系統密碼';
  document.getElementById('ovl-syspwd').classList.add('on');
}
export function confirmDeleteMember(uid){
  const m=getM(uid); if(!m) return;
  reqSysPwd('delete:'+uid);
  document.getElementById('syspwd-title').textContent=`刪除 ${m.name}`;
  document.getElementById('syspwd-sub').textContent='輸入系統密碼以刪除成員及所有資料';
}
function deleteMemberData(uid){
  const m=getM(uid); if(!m) return;
  const name=m.name;
  // Remove member
  S.D.members=S.D.members.filter(x=>x.id!==uid);
  // Remove all checkin data
  delete S.D.checkins[uid];
  // Remove all leave data
  delete S.D.leaves[uid];
  fset({members:S.D.members,['checkins.'+uid]:deleteField(),['leaves.'+uid]:deleteField()}).then(()=>{
    S.loginManageMode=false;
    renderLogin();
    toast(`已刪除 ${name} 的所有資料`);
  });
}
export function confirmNewMember(){
  const nm=(document.getElementById('nm-name').value||'').trim();
  const p1=(document.getElementById('nm-pin').value||'').trim();
  const p2=(document.getElementById('nm-pin2').value||'').trim();
  if(!nm){ toast('請輸入姓名'); return; }
  if(p1||p2){
    if(!/^\d{4}$/.test(p1)){ toast('密碼必須是 4 位數字'); return; }
    if(p1!==p2){ toast('兩次密碼不一致'); return; }
  }
  if(S.D.members.length>=15){ toast('最多 15 位成員'); return; }
  const newId='u'+Date.now();
  const joinWk=wkKey(getMon(0));
  S.D.members.push({id:newId,name:nm,recorder:false,pin:p1||'',joinWk});
  fset({members:S.D.members}).then(()=>{ closeAll(); renderLogin(); toast(`歡迎 ${nm}！從本週開始計算`); });
}

// ── REMOVE PIN ──────────────────────────
export function removePin(){
  const m=getM(S.me); if(!m) return;
  if(!confirm('確定要移除密碼嗎？移除後任何人都可以直接登入你的帳號。')) return;
  m.pin='';
  fset({members:S.D.members}).then(()=>{ closeAll(); renderLogin(); toast('密碼已移除，下次直接進入'); });
}

export function exitManageMode(){ S.loginManageMode=false; renderLogin(); }
