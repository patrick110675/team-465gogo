# AMR Platform 1.0｜積分項目 Firestore 修正版

修正：
- 修復 `Nested arrays are not supported` 錯誤。
- 積分規則改用 Firestore 可接受的物件陣列格式。
- 儲存設定時只合併本次欄位，不再重寫整份 `platform/settings`。
- 相容舊版陣列格式與最近刪除／復原功能。

更新方式：用本資料夾的 `index.html` 覆蓋 GitHub 根目錄原檔案後 Commit。
