# AMR Platform 1.0 Portal 圖片六格統一修正版

本版將 Portal 本身與「專區內容」的 1～6 張圖片改成完全相同的儲存方式。

- 每張圖片獨立存為 contentImage1～contentImage6
- 同時保留 contentImages 陣列，相容舊資料
- 上傳後重新讀取 Firebase 驗證
- 成功後立刻出現縮圖與移除按鈕
- 所有 Portal 都使用相同流程
- 舊 Base64 封面及既有圖片仍可讀取

更新方式：將 index.html 覆蓋 GitHub 專案根目錄原檔並 Commit。
