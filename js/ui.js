import { S } from './state.js';
import { DAYS, MEDALS, NEED, HISTORY, HIST_TOTAL_FINE, WEEK1 } from './constants.js';
import {
  col, getM, midx, fmt, fmtS, mlabel, getMon, wkNum, wkDays, wkKey,
  allWeeks, lbMonthKey, lbMonths, getLvType, isLv, getSt, pen, isPaid
} from './helpers.js';
import { doLogin } from './actions.js';

// ── UI HELPERS ──────────────────────────
export function hideLoad(){ const e=document.getElementById('loading'); e.classList.add('hide'); setTimeout(()=>e.style.display='none',300); }
export function setSdot(s){ const e=document.getElementById('sdot'); if(e) e.className='sdot '+s; }
export function showPage(id){
  document.querySelectorAll('.page').forEach(p=>{ p.classList.remove('on'); p.scrollTop=0; });
  const el=document.getElementById('pg-'+id);
  el.classList.add('on');
  el.scrollTop=0;
}
export function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('tab-'+id).classList.add('on');
  document.querySelectorAll('.tbtab').forEach(b=>b.classList.remove('on'));
  document.getElementById('tbb'+id).classList.add('on');
  document.querySelectorAll('.mob-tab').forEach(b=>b.classList.remove('on'));
  const mob=document.getElementById('mob-tbb'+id);if(mob)mob.classList.add('on');
  if(id==='lb') renderLb();
}
export function closeAll(){ document.querySelectorAll('.ovl').forEach(o=>o.classList.remove('on')); }
export function toast(msg){
  const e=document.getElementById('toast');
  e.textContent=msg; e.classList.add('on');
  clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('on'),2400);
}

// ── LOGIN ────────────────────────────────
// 依目前排行成績（7 月起累積）為登入排序用
export function memberScore(uid){
  const wks=allWeeks(),mons=lbMonths();
  let ck=0,miss=0,lv=0;
  mons.forEach(mk=>wks.filter(w=>lbMonthKey(w)===mk).forEach(mon=>{
    const p=pen(uid,mon,wkDays(mon)); if(p.onLv)lv++; else{ck+=p.ck; if(p.ended)miss+=p.miss;}
  }));
  return ck*10-miss*15+lv*5;
}
export function renderLogin(){
  // 登入卡片依當前排行成績由高到低排序；顏色維持綁定成員本身
  const ordered=[...S.D.members].sort((a,b)=>memberScore(b.id)-memberScore(a.id));
  const memberCards=ordered.map(m=>{
    const c2=col(midx(m.id));
    const hasPin=m.pin&&m.pin.length===4;
    return `<div class="mcard" onclick="openPin('${m.id}')" style="border-color:${c2.c}33;position:relative">
      <div class="mcard-av" style="background:${c2.bg};color:${c2.c}">${m.name[0]}</div>
      <div class="mcard-name">${m.name}</div>
      <div class="mcard-role">成員</div>
      <div class="mcard-arr" style="font-size:12px;color:var(--t3)">${hasPin?'🔒':''}</div>
      ${S.loginManageMode?`<button onclick="event.stopPropagation();confirmDeleteMember('${m.id}')" style="position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:rgba(255,82,82,.15);border:1px solid rgba(255,82,82,.3);color:var(--red);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>`:''}
    </div>`;
  }).join('');
  const addCard=`<div class="mcard-add" onclick="reqSysPwd('addmember')">
    <div class="mcard-add-icon">＋</div>
    <div class="mcard-add-lbl">新增成員</div>
  </div>`;
  const manageBtn=S.loginManageMode
    ?`<div style="width:100%;max-width:480px;margin-top:10px;text-align:center"><button onclick="exitManageMode()" style="background:transparent;border:none;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit">完成管理</button></div>`
    :`<div style="width:100%;max-width:480px;margin-top:10px;text-align:center"><button onclick="reqSysPwd('manage')" style="background:transparent;border:none;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit">管理成員</button></div>`;
  document.getElementById('mgrid').innerHTML=memberCards+addCard;
  // Append manage button below grid
  let mb=document.getElementById('login-manage-btn');
  if(!mb){ mb=document.createElement('div'); mb.id='login-manage-btn'; document.getElementById('pg-login').appendChild(mb); }
  mb.innerHTML=manageBtn;
}
export function openPin(id){
  const m=getM(id); if(!m) return;
  // No PIN set → login directly, no forced setup
  if(!m.pin||m.pin.length!==4){ doLogin(id); return; }
  S.pinTarget=id; S.pinBuf=''; S.pinMode='login';
  updatePinDots();
  document.getElementById('pin-err').textContent='';
  document.getElementById('pin-title').textContent=`${m.name} — 輸入密碼`;
  document.getElementById('pin-sub').textContent='請輸入你的 4 位數密碼';
  document.getElementById('ovl-pin').classList.add('on');
}
export function updatePinDots(){
  for(let i=0;i<4;i++){
    const d=document.getElementById('pd'+i);
    d.classList.toggle('filled',i<S.pinBuf.length);
    d.classList.remove('err');
  }
}

// ── RENDER APP ───────────────────────────
export function renderApp(){
  const t=new Date(); t.setHours(0,0,0,0);
  const mon=getMon(S.wkOff),days=wkDays(mon),num=wkNum(mon);
  const m=getM(S.me),i=midx(S.me),c=col(i);
  const isCur=S.wkOff===0,editable=isCur||(t.getDay()===1&&S.wkOff===-1);

  const pMon=new Date(mon); pMon.setDate(mon.getDate()-7);
  document.getElementById('btn-prev').disabled=pMon<WEEK1;
  document.getElementById('btn-next').disabled=S.wkOff>=0;
  document.getElementById('wklbl').textContent=`第 ${num+1} 週`;
  document.getElementById('wkdates').textContent=`${fmtS(days[0])}（一）— ${fmtS(days[6])}（日）`;
  document.getElementById('wkhint').textContent=(!isCur&&editable)?'📝 週一補登模式':'';

  document.getElementById('mysec').textContent=`我的打卡 — ${m.name}`;
  document.getElementById('mynm').textContent=m.name;
  document.getElementById('myrole').textContent='';
  const av=document.getElementById('myav');
  av.textContent=m.name[0]; av.style.background=c.bg; av.style.color=c.c;

  const p=pen(S.me,mon,days);
  document.getElementById('myn').textContent=p.ck;
  const myEl=document.getElementById('cmy');
  myEl.textContent=`${p.ck}/3`; myEl.className=`cval ${p.ck>=3||p.onLv?'cg':'ca'}`;
  const fEl=document.getElementById('cfine');
  fEl.textContent=`NT$${p.amt}`; fEl.className=`cval ${p.amt===0?'cg':'cr'}`;
  let tot=0; S.D.members.forEach(mm=>{ tot+=pen(mm.id,mon,days).amt; });
  const tEl=document.getElementById('ctot');
  tEl.textContent=`NT$${tot}`; tEl.className=`cval ${tot===0?'cg':'co'}`;

  renderBanner(p);
  renderDays(days,t,editable,mon);

  const actOk=editable&&!p.notJoined;
  document.getElementById('btnck').disabled=!actOk;
  document.getElementById('btnlv-p').disabled=!actOk;
  document.getElementById('btnlv-s').disabled=!actOk;
  document.getElementById('btnck').style.opacity=actOk?'1':'.4';
  document.getElementById('btnlv-p').style.opacity=actOk?'1':'.4';
  document.getElementById('btnlv-s').style.opacity=actOk?'1':'.4';
  const lvType=getLvType(S.me,mon);
  const btnP=document.getElementById('btnlv-p'), btnS=document.getElementById('btnlv-s');
  btnP.textContent=lvType==='personal'?'✓ 事假中':'📋 事假';
  btnP.className=lvType==='personal'?'abtn ab':'abtn';
  btnS.textContent=lvType==='sick'?'✓ 病假中':'🤒 病假';
  btnS.className=lvType==='sick'?'abtn ab':'abtn';
  document.getElementById('btnclr').style.display=(getSt(S.me,fmt(t))==='checked'&&isCur)?'flex':'none';
  renderMembers(days,mon,t);
}

export function renderBanner(p){
  if(p.notJoined){
    const bn=document.getElementById('banner');
    bn.className='banner on lv';
    document.getElementById('bntag').className='bntag b';
    document.getElementById('bntag').textContent='📅 加入前';
    document.getElementById('bndesc').textContent='這週尚未加入，不計罰款與打卡紀錄';
    document.getElementById('bnnote').textContent='';
    document.getElementById('bnamt').className='bnamt b';
    document.getElementById('bnamt').textContent='';
    return;
  }
  const bn=document.getElementById('banner');
  const set=(cls,tc,tt,dt,nt,ac,at)=>{
    bn.className=`banner on ${cls}`;
    document.getElementById('bntag').className=`bntag ${tc}`;
    document.getElementById('bntag').textContent=tt;
    document.getElementById('bndesc').textContent=dt;
    document.getElementById('bnnote').textContent=nt;
    document.getElementById('bnamt').className=`bnamt ${ac}`;
    document.getElementById('bnamt').textContent=at;
  };
  if(p.onLv){
    const lvType=getLvType(S.me,getMon(S.wkOff));
    const lvLabel=lvType==='sick'?'🤒 病假中':'📋 事假中';
    const lvNote=lvType==='sick'?'病假無次數限制':'事假每月限 1 次，本月已使用';
    set('lv','b',lvLabel,`本週免罰款，${lvNote}`,'','b','NT$0'); return;
  }
  if(p.ck>=3){
    const funMsg=['','','','',
      '已完成4次，居然超標了！',
      '已完成5次，真是太認真！',
      '已完成6次，要記得休息欸！',
      '已完成7次，這遊戲應該不是給你玩的！'
    ];
    const msg=p.ck>=7?funMsg[7]:p.ck>=4?funMsg[p.ck]:'已完成'+p.ck+'次，本週免罰款！';
    set('ok','g','✓ 本週達標',msg,'','g','NT$0'); return;
  }
  if(p.ended){ set('warn','r','⚠ 未達標',`完成${p.ck}次，缺${p.miss}次`,p.miss===3?'最高罰款 NT$600':'','r',`NT$${p.amt}`); return; }
  const need=Math.max(0,NEED-p.ck);
  if(need===0) set('ok','g','✓ 已達標','繼續保持！','','g','NT$0');
  else if(p.minMiss>0) set('warn','r','⚠ 確定被罰',`剩餘天數不足，最少缺${p.minMiss}次`,`若完全不去：NT$${p.amt}`,'r',`NT$${p.minAmt}`);
  else set('warn','r',`還差${need}次`,`已完成${p.ck}次，剩${p.rem}天需再${need}次`,`若今天起都沒去：NT$${p.amt}`,'r',`NT$${p.amt}`);
}

export function renderDays(days,t,editable,mon){
  const mm=getM(S.me),joinWk=mm?.joinWk||fmt(WEEK1),notJoined=wkKey(mon)<joinWk;
  document.getElementById('mydays').innerHTML=days.map((d,i)=>{
    const dk=fmt(d),isT=d.getTime()===t.getTime(),isFut=d>t;
    const st=getSt(S.me,dk),onLv=isLv(S.me,mon);
    let cls='dc';
    if(notJoined){ cls+=' dcf dcro'; }
    else if(onLv) cls+=' dclv'; else if(st==='checked') cls+=' dcok';
    if(!notJoined&&isFut) cls+=' dcf';
    if(isT) cls+=' dctd';
    if(!editable&&!notJoined) cls+=' dcro';
    const ico=notJoined?'—':onLv?'休':st==='checked'?'✓':'';
    const oc=!notJoined&&editable&&!isFut&&!onLv?`tapDay('${dk}')` :'';
    return `<div class="${cls}" onclick="${oc}"><div class="dcday">${DAYS[i]}</div><div class="dcdate">${d.getDate()}</div>${ico?`<div class="dcico">${ico}</div>`:''}</div>`;
  }).join('');
}

export function renderMembers(days,mon,t){
  document.getElementById('mlist').innerHTML=S.D.members.map((m,i)=>{
    const c=col(i),isMe=m.id===S.me,p=pen(m.id,mon,days);
    const pct=p.onLv?100:Math.min(100,Math.round(p.ck/3*100));
    let pills='';
    if(p.notJoined) pills='<span class="pill pg">尚未加入</span>';
    else if(p.onLv) pills='<span class="pill pb">請假週</span>';
    else if(p.ck>=3) pills='<span class="pill pok">達標 ✓</span>';
    else pills=`<span class="pill pg">${p.ck}/3</span>`;
    if(p.amt>0) pills+=`<span class="pill pw">罰 $${p.amt}</span>`;
    const mini=days.map(d=>{
      const dk=fmt(d),st=getSt(m.id,dk),isT=d.getTime()===t.getTime(),lv=isLv(m.id,mon);
      return `<div class="md${lv?' lv':st==='checked'?' ok':isT?' td':''}"></div>`;
    }).join('');
    const bc=p.onLv?'var(--blu)':p.ck>=3?'var(--grn)':'var(--acc)';
    return `<div class="mc" style="${isMe?'border-color:'+c.c+';':''}">
      <div class="mchdr"><div class="mcl">
        <div class="av" style="width:32px;height:32px;font-size:12px;background:${c.bg};color:${c.c}">${m.name[0]}</div>
        <div><div class="mcname">${m.name}${isMe?' <span style="font-size:10px;color:var(--t3)">(我)</span>':''}</div>
        <div class="mcrole"></div></div></div>
        <div class="mcpills">${pills}</div></div>
      <div class="prog"><div class="progf" style="width:${pct}%;background:${bc}"></div></div>
      <div class="mini">${mini}</div></div>`;
  }).join('');
}

// ── LEADERBOARD ──────────────────────────
export function renderLbSummary(){
  const el=document.getElementById('lbsummary'); if(!el) return;
  const rows=HISTORY.map(h=>`
    <div class="rcard" style="cursor:default">
      <div class="rnum" style="font-size:15px;width:auto;min-width:38px;color:var(--t2)">${h.label}</div>
      <div class="rinfo"><div class="rname">總打卡 ${h.ck} 次</div>
      <div class="rdetail">罰款 NT$${h.fine}・已繳 NT$${h.paid}・${h.people} 人</div></div>
      <div class="rright"><div class="rscore cg">NT$${h.paid}</div><div class="rscl">已繳清</div></div>
    </div>`).join('');
  el.innerHTML=`<div class="sec">歷史彙整（個人榜自 7 月起）</div>${rows}
    <div class="rcard" style="cursor:default;border-color:rgba(255,82,82,.3);background:var(--red-d)">
      <div class="rnum" style="font-size:18px;width:auto;min-width:38px">💰</div>
      <div class="rinfo"><div class="rname">目前累積罰款</div>
      <div class="rdetail">5 月起累計</div></div>
      <div class="rright"><div class="rscore cr">NT$${HIST_TOTAL_FINE.toLocaleString()}</div><div class="rscl">累積罰款</div></div>
    </div>`;
}

export function renderLb(){
  renderLbSummary();
  const months=lbMonths();
  if(!months.length){
    document.getElementById('mtabs').innerHTML='';
    document.getElementById('pay-action').innerHTML='';
    document.getElementById('lbstats').innerHTML='';
    document.getElementById('ranklist').innerHTML='<p style="color:var(--t3);font-size:13px;padding:1rem 0">個人排行 7 月起開始累積</p>';
    return;
  }
  if(!S.lbMk||(!months.includes(S.lbMk)&&S.lbMk!=='all')) S.lbMk=months[months.length-1];
  document.getElementById('mtabs').innerHTML=
    months.map(mk=>`<button class="mtab${mk===S.lbMk?' on':''}" onclick="setLbMk('${mk}')">${mlabel(mk)}</button>`).join('')
    +`<button class="mtab${S.lbMk==='all'?' on':''}" onclick="setLbMk('all')">全部累積</button>`;

  const isAll=S.lbMk==='all',tgtM=isAll?months:[S.lbMk],wks=allWeeks();
  document.getElementById('pay-action').innerHTML=!isAll
    ?`<button class="abtn ab" onclick="reqPayment('${S.lbMk}')" style="margin-bottom:1rem">💰 記錄 ${mlabel(S.lbMk)} 繳款</button>`
    :'';
  const scores=S.D.members.map((m,i)=>{
    let ck=0,miss=0,lv=0,amt=0;
    tgtM.forEach(mk=>wks.filter(w=>lbMonthKey(w)===mk).forEach(mon=>{ const days=wkDays(mon),p=pen(m.id,mon,days); if(p.onLv)lv++;else{ck+=p.ck;if(p.ended)miss+=p.miss;} amt+=p.amt; }));
    return {m,i,ck,miss,lv,amt,score:ck*10-miss*15+lv*5};
  }).sort((a,b)=>b.score-a.score);

  let totCk=0,totAmt=0,totLv=0;
  scores.forEach(s=>{ totCk+=s.ck; totAmt+=s.amt; totLv+=s.lv; });
  const paidAmt=!isAll?scores.reduce((sum,s)=>sum+(isPaid(s.m.id,S.lbMk)?s.amt:0),0):0;
  document.getElementById('lbstats').innerHTML=
    `<div class="scard"><div class="sclbl">總打卡</div><div class="scval cg">${totCk}</div></div>`
    +`<div class="scard"><div class="sclbl">總罰款</div><div class="scval cr">NT$${totAmt}</div></div>`
    +(!isAll
      ?`<div class="scard"><div class="sclbl">已繳清金額</div><div class="scval cg">NT$${paidAmt}</div></div>`
       +`<div class="scard"><div class="sclbl">參與人數</div><div class="scval ca">${S.D.members.length}</div></div>`
      :`<div class="scard"><div class="sclbl">請假次數</div><div class="scval co">${totLv}</div></div>`
       +`<div class="scard"><div class="sclbl">參與人數</div><div class="scval ca">${S.D.members.length}</div></div>`);

  const wkList=isAll?wks:wks.filter(w=>lbMonthKey(w)===S.lbMk);
  document.getElementById('ranklist').innerHTML=scores.map((s,rank)=>{
    const c=col(s.i),medal=rank<3?MEDALS[rank]:(rank+1);
    const dots=wkList.slice(-8).map(mon=>{ const days=wkDays(mon),p=pen(s.m.id,mon,days);
      if(p.onLv) return '<div class="sdot2 lv2"></div>';
      if(!p.ended) return '<div class="sdot2"></div>';
      return p.miss===0?'<div class="sdot2 hit"></div>':'<div class="sdot2 miss"></div>';
    }).join('');
    const endedWks=wkList.filter(w=>{ const p2=pen(s.m.id,w,wkDays(w)); return p2.ended&&!p2.onLv; });
    let badge='';
    if(endedWks.length>0&&s.miss===0) badge='<span class="rbadge" style="background:rgba(61,255,173,.15);color:var(--grn)">全勤 ✨</span>';
    else if(endedWks.length>0&&s.ck===0) badge='<span class="rbadge" style="background:rgba(255,82,82,.15);color:var(--red)">需加油 💸</span>';
    if(!isAll&&s.amt>0) badge+=(isPaid(s.m.id,S.lbMk)
      ?'<span class="rbadge" style="background:rgba(61,255,173,.15);color:var(--grn)">💰 已繳</span>'
      :'<span class="rbadge" style="background:rgba(255,82,82,.15);color:var(--red)">💸 未繳</span>');
    const scoreColor=s.amt===0?'cg':(!isAll&&isPaid(s.m.id,S.lbMk)?'cg':'cr');
    const scoreLabel=s.amt===0?'本月免罰':(!isAll?(isPaid(s.m.id,S.lbMk)?'✓ 已繳清':'⚠ 尚未繳款'):'累積罰款');
    return `<div class="rcard r${rank+1}" style="${rank===0?'border-color:rgba(255,215,0,.25)':''}">
      <div class="rnum">${medal}</div>
      <div class="av" style="width:40px;height:40px;font-size:16px;background:${c.bg};color:${c.c}">${s.m.name[0]}</div>
      <div class="rinfo"><div class="rname">${s.m.name} ${badge}</div>
      <div class="rdetail">打卡 ${s.ck} 次・缺席 ${s.miss} 次・請假 ${s.lv} 週</div>
      <div class="sbar">${dots}</div></div>
      <div class="rright"><div class="rscore ${scoreColor}">NT$${s.amt}</div>
      <div class="rscl">${scoreLabel}</div></div></div>`;
  }).join('');
}
export function setLbMk(mk){ S.lbMk=mk; renderLb(); }

// ── PAYMENTS (render only; mutation lives in actions.js) ──
export function renderPayList(mk){
  const wks=allWeeks().filter(w=>lbMonthKey(w)===mk);
  let html='',hasAny=false;
  S.D.members.forEach((m,i)=>{
    let amt=0;
    wks.forEach(mon=>{const days=wkDays(mon),p=pen(m.id,mon,days);amt+=p.amt;});
    if(amt===0) return;
    hasAny=true;
    const c=col(i),paid=isPaid(m.id,mk);
    html+=`<div class="pay-row">
      <div style="display:flex;align-items:center;gap:9px">
        <div class="av" style="width:34px;height:34px;font-size:13px;background:${c.bg};color:${c.c}">${m.name[0]}</div>
        <div>
          <div style="font-size:14px;font-weight:500">${m.name}</div>
          <div style="font-size:12px;${paid?'color:var(--grn)':'color:var(--red);font-weight:600'}">${paid?'✓ 已繳清':'NT$'+amt+' 未繳'}</div>
        </div>
      </div>
      <button class="pay-chk${paid?' paid':''}" onclick="togglePayment('${m.id}','${mk}')">${paid?'✓':'○'}</button>
    </div>`;
  });
  if(!hasAny) html='<div style="color:var(--t3);font-size:13px;padding:1rem 0;text-align:center">本月無罰款 🎉</div>';
  document.getElementById('pay-list').innerHTML=html;
}
export function openPayment(mk){
  document.getElementById('pay-sub').textContent=mlabel(mk)+' · 點選切換繳款狀態';
  renderPayList(mk);
  document.getElementById('ovl-payment').classList.add('on');
}
