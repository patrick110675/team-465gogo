# AMR Platform 1.0｜Firestore 免費圖片版

本版將 Portal 與專區內容的內頁圖片改為：

- 不使用 Firebase Storage
- 每張圖片壓縮後，獨立存入 Firestore `portal_images` 集合
- 每個 Portal／每篇內容最多 6 張
- 上傳後立即顯示縮圖
- 可逐張刪除
- 人超盃與其他既有資料不受影響

## 更新方式
把本資料夾的 `index.html` 覆蓋 GitHub 專案根目錄原本檔案後 Commit。

## 注意
PDF 直接上傳仍需 Firebase Storage；免費版建議先使用外部 PDF 連結。
