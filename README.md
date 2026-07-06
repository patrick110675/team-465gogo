# AMR Team V7 Final Release

## 最終補齊項目
- 內建 QR 掃描器（支援 BarcodeDetector 的瀏覽器可直接用相機掃）
- QR 有效時間、防重複簽到
- Excel 匯出：完整報表、排行榜、出席、新朋友、活動統計
- 報表中心：排行榜圖表、週/月/季切換
- PWA 完整化：manifest、App icon、service worker、安裝提示
- 管理中心：隊伍、成員、積分、報表、系統設定
- 一鍵開始新一期

## 管理員密碼
預設：465

## 上傳方式
把整個 ZIP 解壓縮，將所有檔案拖曳上傳到 GitHub Repository 根目錄並 Commit。

## 重要提醒
iPhone 的「內建掃描器」相容性依 Safari 版本而定；若不能開相機掃碼，系統仍可用手機相機掃 QR 或手動貼上連結。


---

## GitHub Pages 部署包
版本：v7-final-github-pages-20260704

本包已加入：
- .nojekyll
- 快取更新碼
- GitHub Pages 部署說明 DEPLOY.md


## 修正版說明
此版修正 GitHub Pages 上可能因 Firebase Auth 網域未授權導致空白畫面的問題：會先顯示本機預設畫面，再嘗試連線 Firebase。
若要完全啟用 Firebase，請到 Firebase Console → Authentication → Settings → Authorized domains 加入 patrick110675.github.io。


## V7 Button Fix
- 修正首頁上方導覽按鈕被封面光效層擋住無法點擊的問題。
- 修正 iPhone / iPad 底部導覽列點擊層級。

## V7.1 Click Fix
- 修正 iPhone / iPad 內建瀏覽器中，首頁四張卡片與底部導覽列無法點擊。
- 加入更高層級的 click delegation，避免透明層或快取造成按鈕失效。
- 強制更新 CSS/JS 快取版本。

## V7.2 Link Navigation Fix
- 將首頁四張卡片、上方導覽列、底部導覽列改成真正的 `<a href>` 連結。
- 即使 iPhone Safari 不執行 onclick，也能正常切換頁面。
- 加入 URL-based page navigation：?page=score / ?page=activity / ?page=rank / ?page=admin。
