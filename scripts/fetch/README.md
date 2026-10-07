# scripts/fetch — 從 colm.cc 與工作坊官網重新抓資料

這些腳本把公開來源整理成 `data-src/` 需要的三份 JSON。它們**在一個工作目錄裡**
運作（會建立 `raw/` 放原始下載），所以請在 `tmp/`（已 gitignore）底下跑，
再把結果複製進 `data-src/`。

```bash
mkdir -p tmp/refresh && cd tmp/refresh
cp -r ../../scripts/fetch ./scripts

# 1) 接受論文：colm.cc 公開 JSON + AcceptedPapers 頁交叉比對 → papers.json
bash scripts/fetch_sources.sh
uv run python scripts/parse_accepted_papers.py
uv run python scripts/build_papers.py

# 2) 議程：官方 Schedule 格線 + virtual calendar + Dates → schedule.json
bash scripts/fetch_schedule.sh
uv run --with beautifulsoup4 --with lxml python scripts/build_schedule.py

# 3) 工作坊：colm.cc 列表 + 18 個官網 → workshops.json（build_workshops.py 內含手動整理的欄位）
bash scripts/fetch_sites.sh && bash scripts/fetch_colm_workshop_pages.sh && bash scripts/fetch_subpages.sh
uv run --with beautifulsoup4 python scripts/parse_colm_virtual.py
uv run --with beautifulsoup4 python scripts/build_workshops.py

cp papers.json schedule.json workshops.json ../../data-src/
cd ../.. && uv run python scripts/build_data.py && uv run python scripts/build_pages.py && uv run python scripts/prerender.py
```

## 工作坊接受論文（要登入 colm.cc，在瀏覽器裡跑）

colm.cc 的工作坊頁只有登入後才會列出各海報時段的論文，所以用瀏覽器抓：
登入 colm.cc → 打開任一工作坊頁 → 把 `scripts/fetch/colm_workshop_papers.js` 貼進 DevTools console
（會把 JSON 複製到剪貼簿）→ 存成 `tmp/workshop-papers-raw.json`，再：

```bash
uv run python scripts/fetch/build_workshop_papers.py tmp/workshop-papers-raw.json   # → data-src/workshop-papers.json
uv run python scripts/build_data.py
```

標題的中文翻譯在 `data-src/workshop-papers-zh.json`（`{colmId: 中文標題}`），新增論文時要補；
`build_data.py` 印出的 `zh title` 數字會少。

## 地圖頁（在 repo 根目錄直接跑，不用複製到 tmp/）

```bash
# 官方試算表（分類、價位、描述、Google Maps 連結）+ My Maps KML（座標）→ data-src/places.json
uv run --with openpyxl --with certifi python scripts/fetch/build_places.py
# SFPD 事件通報（DataSF）最近 365 天 → 約 110 m 格點 → data-src/safety.json
uv run --with certifi python scripts/fetch/build_safety.py

uv run python scripts/build_data.py        # → data/map.js
```

新增地點後記得在 `data-src/places-zh.json` 補中文描述（`build_data.py` 印出的 `zh` 數字會少）。
注意區域（`data-src/map-text.json` 的 `zones`）是手動整理的，位置對照 `safety.json` 最熱的幾群格子。

## 其他資料來源（不在這些腳本裡）

| 檔案 | 怎麼來的 |
|---|---|
| `data-src/topics.json` | 17 個徵稿主題，取自 `data/data.js` 的 topics 區段 |
| `data-src/papers-topics.json` | 每篇論文的主題：OpenReview 的作者關鍵字 + 標題，由 LLM 歸入 17 個主題（非官方） |
| `data-src/papers-zh.json` | 論文標題與摘要的繁體中文翻譯（LLM 翻譯，人工抽查） |
| `data-src/zh.json` | 工作坊簡介、議程場次名、日期標籤的中文 |
| `scripts/fetch/speakers.json` | keynote 講者與座談來賓的單位與個人頁（colm.cc 沒有，來自公開個人頁） |

OpenReview 的 notes API 對匿名程式會回 403（Cloudflare 驗證），關鍵字是用瀏覽器登入狀態
從 `api2.openreview.net/notes?content.venueid=colmweb.org/COLM/2026/Conference` 取得的；
要更新請在瀏覽器 console 重抓。
