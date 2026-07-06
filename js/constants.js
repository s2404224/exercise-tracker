// ════════════════════════════════════════
// 🔧 填入你的 Firebase 設定
// ════════════════════════════════════════
export const FB = {
  apiKey:            "AIzaSyDGbFplRVkildPIsJAUDSJcMj26Dcsu1Ek",
  authDomain:        "exercise-tracker-15e13.firebaseapp.com",
  projectId:         "exercise-tracker-15e13",
  storageBucket:     "exercise-tracker-15e13.firebasestorage.app",
  messagingSenderId: "685157644600",
  appId:             "1:685157644600:web:85d7129fa4d102747229cd"
};
// ════════════════════════════════════════

// ── CONFIG ──────────────────────────────
export const WEEK1=new Date(2026,5,29); WEEK1.setHours(0,0,0,0);
export const PAY=10,MAX_PAY=10,NEED=1;
export const DAYS=['一','二','三','四','五','六','日'];
export const MEDALS=['🥇','🥈','🥉'];
export const SYS_PWD='9715'; // 系統密碼
export const COLORS=[
  {c:'#e8ff57',bg:'rgba(232,255,87,.13)'},{c:'#52b8ff',bg:'rgba(82,184,255,.13)'},
  {c:'#ff5252',bg:'rgba(255,82,82,.13)'},{c:'#3dffad',bg:'rgba(61,255,173,.13)'},
  {c:'#ffaa3d',bg:'rgba(255,170,61,.13)'},{c:'#c97bff',bg:'rgba(201,123,255,.13)'},
  {c:'#ff7eb3',bg:'rgba(255,126,179,.13)'},{c:'#7bfff4',bg:'rgba(123,255,244,.13)'},
  {c:'#a8ff78',bg:'rgba(168,255,120,.13)'},{c:'#f9a825',bg:'rgba(249,168,37,.13)'},
  {c:'#e040fb',bg:'rgba(224,64,251,.13)'},{c:'#00e5ff',bg:'rgba(0,229,255,.13)'},
  {c:'#ff6e40',bg:'rgba(255,110,64,.13)'},{c:'#69f0ae',bg:'rgba(105,240,174,.13)'},
  {c:'#536dfe',bg:'rgba(83,109,254,.13)'}
];

// 歷史彙整：App 開始記錄前的人工統計，僅總計、無個人資料
export const HISTORY=[
  {label:'5月', ck:'154', fine:200, paid:200, people:11},
  {label:'6月', ck:'100+', fine:400, paid:400, people:12}
];
export const HIST_TOTAL_FINE=7000; // 目前累積罰款
