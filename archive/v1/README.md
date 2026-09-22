# COLM 2026 · 非官方資訊網站

把 [Conference on Language Modeling (COLM) 2026](https://colmweb.org/) 官網的所有內容,整理成一個**可搜尋、可篩選、雙語、可深連結**的純靜態單頁網站。

> 🌐 **線上版**:<https://colm2026.peteraim.com/>

COLM 是聚焦於「廣義語言建模」的學術會議,2026 年 10 月 6–9 日於**美國舊金山 Hilton Union Square** 舉行。本站把官網十多個頁面(關於、重要日期、徵稿、各類指南與政策、工作坊、組織成員、FAQ)整併成單一頁面,讓你用一個搜尋框就找到所有資訊。

---

## ✨ 功能特色

- **🔎 全文搜尋(跨語)** — 不論畫面是中文或英文,搜尋 `ethics`、`Cornell`、`tokenization`、`海報`、`利益衝突` 都能即時命中(同時索引中英內容)。
- **🏷️ 分類篩選** — 7 大類 chip:關於 / 重要日期 / 徵稿 / 指南與政策 / 工作坊 / 組織成員 / FAQ。
- **🌐 中英全頁切換** — 一鍵把整頁(卡片、詳情、介面、標題)在繁體中文與英文間切換,無任何文字殘留。
- **🌗 深淺色切換** — 暖色編輯風的淺色與石墨深色,選擇會記在 `localStorage`。
- **🔗 深連結** — 每張卡片都有 `#slug` 錨點,可直接分享某筆內容(例如 `#call-for-papers`、`#main-track-timeline`)。
- **⏳ 截止日倒數** — Hero 自動顯示下一個重要截止日還有幾天。
- **🗓️ 時間軸** — 重要日期以時間軸呈現,已過期會劃掉、下一個會高亮。
- **⌨️ 鍵盤操作** — 卡片可用 Enter 開啟;詳情視窗可用 ← / → 切換、Esc 關閉。
- **📱 響應式 + 無障礙** — 手機 375px 無水平溢出;互動元件皆有 aria 標籤。
- **🚀 零 build** — 純 HTML / CSS / JS,沒有打包工具、沒有框架,可直接部署到 GitHub Pages。

---

## 📂 內容結構

```
colm2026/
├── index.html          # 單頁:版面、SEO/OG/JSON-LD、hero、搜尋、卡片、詳情視窗
├── assets/
│   ├── styles.css      # minimalist 編輯風 + MD3 深淺色 token(純 CSS)
│   └── app.js          # 狀態機、渲染、搜尋/篩選、雙語、倒數、深連結
├── data/
│   └── data.js         # window.SITE_DATA(79 筆雙語條目)+ 分類 + 截止日
├── .nojekyll           # 讓 GitHub Pages 跳過 Jekyll 處理
└── README.md
```

資料層 `data/data.js` 共 **79 筆**條目:關於 5、重要日期 2、徵稿 2、指南與政策 7、工作坊 18、組織成員 20、FAQ 25。每筆都是 `{ en, zh }` 雙語物件,呈現層(`app.js`)與資料層分離 —— 官網更新時只要改 `data.js` 即可。

### 資料來源

- 全部內容萃取自 **COLM 官方網站 <https://colmweb.org/>**(2026 年 5 月擷取)。
- 英文側忠實重現官網文字;中文側為**忠實翻譯**,方便閱讀。政策文件(行為準則、倫理準則、利益衝突等)**以官方英文為準**。
- 委員/理事姓名、單位、連結皆照官網原樣呈現(例如官網標題寫的是 `Subhi Goel`,即照此呈現,雖然其個人網站為 surbhigoel.com)。

---

## 🛠️ 本機使用

純靜態網站,任何靜態伺服器都能跑。依專案慣例使用 `uv`:

```bash
# 啟動本機伺服器
uv run python -m http.server 4173
# 然後開 http://localhost:4173
```

或直接用瀏覽器打開 `index.html` 也可以(`file://` 也能運作,因為資料是 `window.*` 全域變數,無需 `fetch`)。

### (選配)跑 UX 測試

本站以 Playwright 驗證過卡片渲染、雙語/主題切換、搜尋、篩選、詳情視窗、深連結、375px 響應式與基本無障礙:

```bash
uv run --with playwright playwright install chromium     # 首次
```

搭配自訂的 Playwright 腳本可跑上述檢查。

---

## 📝 聲明

本網站為**非官方、由社群製作**的 COLM 2026 資訊鏡像,並非 COLM 主辦單位的官方產物。所有內容版權屬於 **COLM 主辦單位**;**最新與權威資訊請以官方網站 [colmweb.org](https://colmweb.org/) 為準**。若資訊與官網有出入,以官網為準。

零 build 靜態 HTML/CSS/JS。
