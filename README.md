# AMR Platform 1.0 — Portal 欄位與 PDF 上傳修正版

## 本版修正
- Portal 內頁會顯示：時間、地點、報名／外部連結、按鈕文字。
- 報名網址即使沒有輸入 `https://`，系統也會自動補上。
- PDF 改為直接選擇 `.pdf` 檔案上傳，不需要自行貼網址。
- PDF 上傳至 Firebase Storage，下載網址會自動保存到 Firestore。
- 內頁可同時顯示報名按鈕、PDF 按鈕與 YouTube 按鈕。
- 舊欄位名稱相容：date/time/eventDate、place/location/eventPlace、url/link/registrationUrl。

## 更新方式
將解壓縮後的 `index.html`、`README.md` 覆蓋 GitHub 專案根目錄，再 Commit changes。

## 注意
PDF 上傳需要 Firebase Storage 已啟用，且規則允許已登入的匿名使用者上傳檔案。
