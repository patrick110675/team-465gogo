# GitHub Pages 部署說明｜AMR Team V7

## 上傳方式
1. 解壓縮這個 ZIP。
2. 打開解壓縮後的資料夾。
3. 將資料夾裡面的所有檔案與資料夾直接拖曳到 GitHub Repository 根目錄。
4. Commit changes。

## 重要
請上傳資料夾裡面的內容，不要上傳最外層資料夾本身。

正確：
- index.html
- css/
- js/
- icons/
- manifest.json
- service-worker.js
- .nojekyll

錯誤：
- amr-team-v7-github-pages-deploy/

## GitHub Pages 設定
Repository → Settings → Pages：
- Source：Deploy from a branch
- Branch：main
- Folder：/root

## 如果更新後還看到舊畫面
這版已加入快取更新碼。
若仍看到舊畫面：
- iPhone Safari：設定 → Safari → 清除網站資料
- 電腦：Ctrl + Shift + R / Cmd + Shift + R
- PWA App：刪除主畫面 App 後重新加入

## 管理員密碼
預設：465
