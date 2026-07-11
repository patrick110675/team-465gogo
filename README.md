# AMR Platform 1.0 — Portal Storage 修正版

## 修正內容
- 修正 Portal 儲存時 Firestore 文件超過 1MB 的錯誤。
- 封面圖片、六張內頁圖片改存 Firebase Storage。
- Firestore 只保存圖片下載網址，不再保存 Base64 圖片字串。
- 舊版已存在的 Base64 圖片，在再次儲存 Portal 時會自動搬移到 Storage。
- PDF 仍維持上傳到 Firebase Storage。

## 更新方式
將 `index.html` 覆蓋 GitHub 專案根目錄的同名檔案並 Commit。

## 測試
1. 管理 → Portal → 編輯一筆資料。
2. 上傳封面及內頁圖片。
3. 按「儲存 Portal」。
4. 確認不再出現 `maximum size of 1,048,576 bytes`。
5. 回 Portal 檢查六宮格封面與內頁圖片。
