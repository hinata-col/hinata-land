# 日向坂樂園 上線步驟

網站：`https://hinata-land.pages.dev`
程式：GitHub `hinata-col/hinata-land`
資料：Google 試算表「日向坂冠番」→ 一鍵更新 → `data/episodes.json`
帳號與互動（登入、清單、讚、留言）：Firebase

---

## 一、Firebase（約 10 分鐘）

1. 到 <https://console.firebase.google.com> → 新增專案，名稱例如 `hinata-land`（Google Analytics 可以關掉）。
2. 左邊「建構 → Authentication」→ 開始使用 → 「登入方式」：
   - 開啟 **匿名**
   - 開啟 **Google**（專案支援電子郵件選你自己的信箱）
3. Authentication →「設定」→「已授權網域」→ 新增 `hinata-land.pages.dev`
4. 左邊「建構 → Firestore Database」→ 建立資料庫：
   - 位置選 **asia-east1（台灣）**
   - 先選「正式版模式」
5. Firestore →「規則」分頁 → 把這個 repo 裡 `firestore.rules` 的內容整個貼上 → 發布。
6. 專案設定（左上齒輪）→「一般」→ 下方「你的應用程式」→ 點 `</>` 新增網頁應用程式（暱稱隨意，不用勾 Hosting）→ 複製畫面上的 `firebaseConfig`。
7. 把 `firebaseConfig` 貼到 `assets/config.js` 的 ① 位置。

## 二、Cloudflare Pages（約 5 分鐘）

1. <https://dash.cloudflare.com> → Workers & Pages → 建立 → Pages →「連接到 Git」。
2. 授權 GitHub，選 `hinata-col/hinata-land`。
3. 專案名稱填 `hinata-land`（網址就會是 hinata-land.pages.dev）。
4. 建置設定：架構預設 **無**、建置命令 **留空**、輸出目錄 **/**（或留空）。
5. 儲存並部署。之後 GitHub 有更新，Cloudflare 會自動重新部署（約 1 分鐘）。

> 如果名稱被用走、網址變成 `hinata-land-xxx.pages.dev`：
> 改 `assets/config.js` 的 ③ `SITE`，並把新網址加到 Firebase 的已授權網域。

## 三、試算表一鍵更新（約 5 分鐘）

1. GitHub → 右上頭像 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Token name：`hinata-land 試算表`
   - Expiration：1 年（到期前會收到信，再產生一組貼回試算表即可）
   - Resource owner：`hinata-col`
   - Repository access：Only select repositories → `hinata-land`
   - Permissions → Repository permissions → **Contents：Read and write**
   - 產生後複製 token（只會顯示一次）
2. 打開試算表 → 擴充功能 → Apps Script → 把 `tools/apps-script.gs` 的內容整個貼上 → 儲存。
3. 回到試算表重新整理，上方會多一個「日向坂樂園」選單：
   - 先按「設定 GitHub 金鑰」，貼上剛剛的 token
   - 再按「更新網站資料」（第一次會要求授權，選你的帳號 → 進階 → 前往 → 允許）
4. 之後改完試算表，按「日向坂樂園 → 更新網站資料」就好。

匯出的只有：回、播出日、日文標題、中文標題、系列。備註、來源、MC 等欄位不會上網站。
「回」不是數字的列（空白、說明、待歸位）會自動跳過。

## 四、まだひな開園

試算表整理好後，把 `assets/config.js` 的 ② 改成 `['R', 'H', 'M']`。

## 檢舉留言

Firebase 主控台 → Firestore → `reports` 集合可以看到檢舉，`cid` 是留言編號，
到 `comments` 集合找到同一筆刪掉即可。
