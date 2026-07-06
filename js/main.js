import { getLvType } from './helpers.js';
import { closeAll, showTab, openPin, setLbMk } from './ui.js';
import { initFB } from './firebase.js';
import {
  exitManageMode, doLogin, doLogout, chWk, openCk, togCk, confirmCk, doLeave,
  clearToday, openSet, setDel, setAdd, setSave, tapDay, pinKey, openNewMember,
  confirmNewMember, removePin, reqSysPwd, spKey, confirmDeleteMember,
  togglePayment, reqPayment, restoreFromBackup, downloadBackup
} from './actions.js';

// inline onclick="..." handlers in index.html need these on window
Object.assign(window, {
  exitManageMode, doLogin, doLogout, showTab, chWk, closeAll, openCk, togCk,
  confirmCk, doLeave, clearToday, openSet, setDel, setAdd, setSave, tapDay,
  openPin, pinKey, openNewMember, confirmNewMember, removePin, getLvType,
  reqSysPwd, spKey, confirmDeleteMember, togglePayment, reqPayment,
  restoreFromBackup, downloadBackup, setLbMk
});

initFB();
