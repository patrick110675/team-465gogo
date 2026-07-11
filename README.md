# AMR Platform 1.0 完整整合版

這是把先前功能與修正合併後的完整專案，不是補丁。

## 已整合功能
- Firebase Authentication、Firestore、Storage
- 舊隊伍與人員資料匯入
- 個人積分與團隊積分分開計算
- 團隊積分可選隊伍與姓名，姓名只作為紀錄
- 自動依今天日期判斷週數，補登時可手動選週
- 積分項目新增、修改、刪除、最近刪除與復原
- 積分規則轉成 Firestore 支援格式，避免 Nested arrays 錯誤
- 排行榜、積分歷史修改與刪除
- Portal 六張封面依順序批次上傳
- Portal 內頁最多六張圖片
- 封面與內頁圖片存 Firebase Storage，Firestore 只存網址
- Portal 貼文、時間、地點、報名連結、按鈕文字、YouTube
- PDF 檔案直接上傳 Firebase Storage
- 公告、隊伍、人員、Portal、首頁與主題管理
- 中央「＋」選單自動收合

## 更新方式
1. 解壓縮 ZIP。
2. 將 `index.html` 與 `README.md` 上傳並覆蓋 GitHub 專案根目錄。
3. 按 Commit changes。
4. 等 GitHub Pages 更新後，請用無痕模式或清除快取再測試。

## 建議測試順序
1. 修改積分項目分數，重新整理確認保留。
2. 新增個人積分，確認團隊分數不增加。
3. 新增團隊積分並選姓名，確認只增加團隊分數。
4. 第一週設為 2026/06/29，確認 2026/07/10 自動是第 2 週。
5. Portal 上傳封面與六張內頁圖，確認方框與內頁都顯示。
6. 上傳 PDF，確認可開啟。
