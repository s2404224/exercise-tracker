// Single shared mutable state object. Other modules import S and read/write
// its properties directly (e.g. S.me = id) instead of reassigning module-level
// bindings, which ES modules don't allow across files.
export const S = {
  me: null,
  wkOff: 0,
  lbMk: null,
  fsdb: null,
  D: { members: [], checkins: {}, leaves: {}, payments: {} },
  pinBuf: '', pinTarget: null, pinMode: null,
  spBuf: '', spAction: null,
  loginManageMode: false,
  firstLoadDone: false, // 防止 onSnapshot 誤判空文件而覆寫真實資料
  dailyDoneFor: null     // 記錄今天是否已做過每日備份
};
