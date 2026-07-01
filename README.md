# 今天不練，明天掏錢 💪
運動打卡系統 — 多人即時同步，每週計算罰款
## 功能
每週打卡（週一至週日），每週需達標次數，未達標即計罰款

缺一次罰款 NT$200，單週上限 NT$600

請假免罰款（事假每月一次、病假不限次數）

排行榜 + 出勤圓點視覺化（達標／請假／缺席）

繳款記錄與月份彙整

Firebase Firestore 即時同步（多人同時打卡不互相覆蓋）

每日自動雲端備份、一鍵下載 JSON 備份

## 設定 Firebase
在 `index.html` 找到 `FIREBASE_CONFIG` 區塊，填入你的 Firebase 設定值，並在 Firebase 主控台啟用 Firestore Database。
## 自訂規則
打卡次數、罰款金額、上限、起始週等參數可在 `index.html` 上方常數區調整。
## 部署
此站台透過 GitHub Pages 自動部署。
