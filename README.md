# COLM 2026 · 非官方雙語整理站

把 [Conference on Language Modeling (COLM) 2026](https://colm.cc/) 的議程、**856 篇接受論文**、
18 場工作坊、重要日期、徵稿主題、組織與政策，整理成一個**英文為主、中文對照、零 build** 的靜態網站。

> 🌐 **線上版** → <https://colm2026.peteraim.com/>（中文：<https://colm2026.peteraim.com/zh/>）

COLM 2026 是第三屆語言模型會議，2026 年 10 月 6–9 日於**美國舊金山 Hilton Union Square** 舉行：
10/6–10/8 主會議（單軌：主題演講、口頭報告、海報），10/9 工作坊日。

---

## 頁面

| 頁面 | 英文 | 中文 | 內容 |
|---|---|---|---|
| **About** | `/` | `/zh/` | 總覽、關於 COLM、重要日期、徵稿主題、工作坊、組織成員、FAQ、指南與政策、註冊 |
| **Schedule** | `/schedule/` | `/zh/schedule/` | 四天逐場次議程（keynote、oral、poster、座談、休息、社交、工作坊）+ 官方全部日期 |
| **Accepted Papers** | `/papers/` | `/zh/papers/` | 856 篇論文：依日期 / 場次 / 房間 / 主題 / Oral 篩選，摘要、作者、單位、海報位置、連結 |
| **Workshops** | `/workshops/` | `/zh/workshops/` | 18 場工作坊：簡介、主題、當日議程、講者、截止日、主辦人、官網 |

- 頂列 **About ▾ · Schedule · Accepted Papers · Workshops**，手機收成抽屜；About 下拉收納首頁各區段。
- 語言切換是真正的連結，並保留篩選狀態與選中的項目（`?day=…&room=…&topic=…&p=<id>` 直接可分享）。
- 議程頁的 Oral 場次可展開論文並連到論文頁；海報場次連到篩選好的論文清單；週五連到工作坊頁。
- 房間顏色在議程頁與論文頁一致；深 / 淺色主題記在 `localStorage`。
- 論文摘要另拆成延遲載入檔（`data/papers-abstracts.{en,zh}.js`），首屏只載核心資料。

---

## 資料來源

| 資料 | 來源 | 備註 |
|---|---|---|
| 議程、日期、房間、海報編號 | colm.cc 官方 Schedule / Dates 頁與公開 JSON | 最後更新見 `data/papers.js` 的 `meta.generated` |
| 論文標題、作者、單位、摘要 | colm.cc 公開 JSON（`/static/virtual/data/…`） | 作者單位覆蓋 99.7% 作者 |
| 論文主題（17 類） | OpenReview 作者關鍵字 + 標題，由 LLM 歸入徵稿主題 | **非官方**分類，UI 有標示 |
| 論文中文標題與摘要 | LLM 翻譯（繁體中文、台灣用語） | 人名、單位、模型與資料集名稱維持英文 |
| 工作坊 | colm.cc 列表 + 各工作坊官網 | 房間 colm.cc 尚未公布 |
| keynote 講者單位 | 講者公開個人頁（colm.cc 只有姓名） | 講題尚未公布 |

所有內容版權屬 **COLM 主辦單位與各論文作者**；**最新與權威資訊請以 [colm.cc](https://colm.cc/) 為準**。
本站為非官方、社群製作。

---

## 結構

```
colm2026/
├── index.html · schedule/ · papers/ · workshops/     英文（root）
├── zh/                                                中文（同樣四頁）
├── en/index.html                                      舊網址轉址殘頁（→ /）
├── assets/
│   ├── styles.css     MD3 基底 + 學術簡潔皮膚（首頁原有）
│   ├── site.css       多頁新增：頂列、下拉、抽屜、主從版面、篩選、議程
│   ├── shell.js       共用 chrome：頂列、抽屜、主題、語言連結、footer、dialog
│   ├── app.js         首頁區段渲染（typed section registry + scrollspy）
│   ├── schedule.js · papers.js · workshops.js
│   ├── favicon.svg    站徽（唯一來源；字母畫成 path，SVG favicon 吃不到 webfont）
│   ├── favicon-32.png · apple-touch-icon.png · icon-512.png   由 favicon.svg 產生
│   └── og-image.png   1200×630 分享預覽圖
├── data/              產生檔（不要手改）：data.js、schedule.js、papers.js、papers-abstracts.*.js、workshops.js
├── data-src/          來源 JSON：papers / schedule / workshops / topics / zh / papers-zh / papers-topics
├── scripts/
│   ├── build_data.py      data-src/*.json → data/*.js（合併中文與主題）
│   ├── build_pages.py     8 個 HTML 外殼 + sitemap.xml + robots.txt + en/ 轉址殘頁
│   ├── prerender.py       把 JS 渲染結果烤進靜態 HTML（SEO / 無 JS）
│   ├── make_brand_assets.py  favicon.svg → 各尺寸 PNG + og-image.png
│   ├── zh_punct.py        中文字串半形標點 → 全形
│   ├── shot.py            Playwright：8 頁截圖 + console 錯誤檢查
│   └── fetch/             從 colm.cc 與工作坊官網重抓資料（見 scripts/fetch/README.md）
├── archive/           v1–v3 舊版設計（noindex，保留）
├── CNAME · sitemap.xml · robots.txt · .nojekyll
└── README.md
```

`data/data.js` 的首頁內容仍是手寫；其餘 `data/*.js` 全部由 `scripts/build_data.py` 產生。

---

## 本機使用

純靜態，用 `uv` 跑工具：

```bash
uv run python -m http.server 4173          # 開 http://localhost:4173/
```

更新資料 / 重產頁面（順序固定）：

```bash
uv run python scripts/build_data.py        # data-src → data/*.js
uv run python scripts/build_pages.py       # 8 頁外殼 + sitemap + robots
uv run --with playwright python scripts/prerender.py   # 烤進靜態內容（需 chromium）
uv run --with playwright python scripts/shot.py        # 截圖 + console 檢查（輸出到 tmp/shots/）
uv run python scripts/zh_punct.py --check data/data.js data-src/zh.json   # 中文標點檢查
```

改動站徽或分享圖時才需要重產圖（`assets/*.png` 是產生檔，不要手改）：

```bash
uv run --with playwright python scripts/make_brand_assets.py
```

第一次跑 Playwright：`uv run --with playwright playwright install chromium`。

---

## 部署

GitHub Pages（從 `main` 部署）+ Cloudflare DNS，自訂網域 `colm2026.peteraim.com`（`CNAME`）。
merge 進 `main` 即上線。舊網域 `colm-info.peteraim.com` 已停用。

---

## 版本沿革

| 版本 | 內容 |
|---|---|
| **v5（目前）** | 多頁改版：議程 / 接受論文 / 工作坊三頁、英文 root + `/zh/`、網域 colm2026、資料管線腳本 |
| v4 | 單頁複合多區段（現在的 About 頁），學術簡潔風 |
| v1–v3 | gallery / FAQ / timeline 三種版型，封存在 `archive/` |
