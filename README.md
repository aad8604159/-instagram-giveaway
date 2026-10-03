# IG 留言抽獎工具｜網頁版

這是一個可部署到網路上的完整網站，不是只能在電腦本機開啟的 HTML。

## 網頁功能

- Instagram OAuth 登入／授權
- 貼上 Instagram 貼文網址
- 自動取得該授權專業帳號的貼文留言
- 「最少標記人數」自由設定，例如 1、3、5、10
- 重複留言僅保留一條
- 每位參加者只能中獎一次
- 得獎人數自由設定
- 指定留言關鍵字
- 隨機抽獎
- CSV 匯出得獎名單
- 手機／平板／電腦響應式介面

## 最簡單的部署方式

可以部署到任何支援 Node.js / Docker 的雲端平台，例如 Render、Railway、Fly.io 等。

### 1. 上傳這個專案

把整個資料夾上傳到 GitHub。

### 2. 建立 Web Service

以 Render 為例，建立 Web Service，連結 GitHub Repository。
本專案已附 `render.yaml` 和 `Dockerfile`。

### 3. 設定環境變數

在雲端平台加入：

INSTAGRAM_APP_ID=你的 Meta App ID
INSTAGRAM_APP_SECRET=你的 Meta App Secret
INSTAGRAM_REDIRECT_URI=https://你的網站網址/auth/instagram/callback
SESSION_SECRET=請使用一組長且隨機的密碼
GRAPH_API_VERSION=v26.0

### 4. Meta / Instagram App

在你的 Meta App 裡，把 OAuth Redirect URI 設為：

https://你的網站網址/auth/instagram/callback

開發測試時可以先用：
http://localhost:3000/auth/instagram/callback

### 5. 使用

部署完成後會得到例如：

https://your-ig-lottery.example.com

使用者直接用手機打開這個網址：

Instagram 登入
↓
貼上 IG 貼文
↓
載入留言
↓
設定「最少標記人數」
↓
設定「得獎人數」
↓
開始抽獎

## 重要

Instagram 官方 API 的授權與留言讀取受帳號類型、App 權限及 Meta 審核／產品設定限制。
本程式不會繞過 Instagram 的登入或存取限制，也不會直接抓取任意帳號的私人資料。

目前搜尋官方 Meta 文件時未取得可用的搜尋結果，因此此版本沿用前一版已整合的 Instagram OAuth/API 架構；正式上線前，請在 Meta for Developers 後台確認你目前 App 所顯示的權限名稱與 API 版本。
