"""Generate the 8 HTML shells (4 pages × en/zh) for the COLM 2026 site.

Usage:
    uv run python scripts/build_pages.py            # writes the 8 pages + sitemap.xml + robots.txt + en/ stub
    uv run python scripts/build_pages.py --out tmp/preview

Only the *shell* is generated here: <head> meta/SEO, app bar, drawer, page
scaffold, dialog, footer, script tags. Page content is rendered by the page
scripts from data/*.js. Zero-build for the browser still holds; this script is
a convenience so eight near-identical heads never drift apart.
"""
from __future__ import annotations

import argparse
from pathlib import Path


def repo_root() -> Path:
    p = Path(__file__).resolve()
    for parent in [p] + list(p.parents):
        if (parent / ".git").exists():
            return parent
    return p.parents[1]


ROOT = repo_root()

DOMAIN = "https://colm2026.peteraim.com"
ZH_DIR = "zh"
GA_ID = "G-55QL75DCKR"

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
    '  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700'
    '&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Noto+Sans+TC:wght@400;500;700'
    '&family=Noto+Serif+TC:wght@500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet" />\n'
    '  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />'
)

# ---------------------------------------------------------------------------
# Page registry. `slug` "" = home. Text is per language.
# ---------------------------------------------------------------------------
PAGES = {
    "about": {
        "slug": "",
        "title": {"en": "COLM 2026 · Conference on Language Modeling",
                  "zh": "COLM 2026 · 語言模型會議"},
        "desc": {"en": "Unofficial bilingual guide to COLM 2026, the 3rd Conference on Language Modeling — Hilton Union Square, San Francisco, Oct 6–9, 2026. Schedule, accepted papers, workshops, dates, calls, organizers and policies, curated from colm.cc.",
                 "zh": "COLM 2026（第三屆語言模型會議）非官方雙語整理：2026 年 10 月 6–9 日，舊金山 Hilton Union Square。議程、接受論文、工作坊、重要日期、徵稿、組織與政策，內容整理自 colm.cc。"},
        "scripts": ["data/data.js", "assets/app.js"],
        "ld": "WebSite",
    },
    "schedule": {
        "slug": "schedule/",
        "title": {"en": "Schedule · COLM 2026", "zh": "議程 · COLM 2026"},
        "desc": {"en": "COLM 2026 program day by day: keynotes, oral and poster sessions, panel, and the Friday workshops — plus every official deadline and key date.",
                 "zh": "COLM 2026 逐日議程：主題演講、口頭報告與海報場次、座談、週五工作坊，以及所有官方截止日與重要日期。"},
        "h1": {"en": "Schedule", "zh": "議程"},
        "sub": {"en": "Four days at Hilton Union Square, San Francisco. Tap a day; oral sessions expand to their papers, poster sessions link to the filtered paper list.",
                "zh": "四天議程，舊金山 Hilton Union Square。點選日期；口頭報告可展開論文清單，海報場次可直接連到篩選後的論文列表。"},
        "scripts": ["data/schedule.js", "assets/schedule.js"],
        "ld": "WebPage",
    },
    "papers": {
        "slug": "papers/",
        "title": {"en": "Accepted Papers · COLM 2026", "zh": "接受論文 · COLM 2026"},
        "desc": {"en": "Browse every COLM 2026 accepted paper: filter by day, room, topic and oral presentations; read abstracts, authors, affiliations, poster location and official links.",
                 "zh": "瀏覽 COLM 2026 全部接受論文：依日期、房間、主題、Oral 篩選；查看摘要、作者、單位、海報位置與官方連結。"},
        "h1": {"en": "Accepted Papers", "zh": "接受論文"},
        "sub": {"en": "Filter at the top, pick a paper on the left, read on the right. Room colours match the schedule. Copy the URL to share a filtered view or a single paper.",
                "zh": "上方篩選、左側選論文、右側閱讀。房間顏色與議程頁一致。複製網址即可分享篩選結果或單篇論文。"},
        "scripts": ["data/papers.js", "assets/papers.js"],
        "ld": "WebPage",
    },
    "workshops": {
        "slug": "workshops/",
        "title": {"en": "Workshops · COLM 2026", "zh": "工作坊 · COLM 2026"},
        "desc": {"en": "All 18 COLM 2026 workshops on Friday, October 9: what each one is about, its program, invited speakers, deadlines and official website.",
                 "zh": "COLM 2026 全部 18 場工作坊（10 月 9 日週五）：主題簡介、當日議程、邀請講者、截止日與官方網站。"},
        "h1": {"en": "Workshops", "zh": "工作坊"},
        "sub": {"en": "Friday, October 9, 2026 · 18 workshops run in parallel from 8:30 AM. Pick one on the left.",
                "zh": "2026 年 10 月 9 日（五）· 18 場工作坊自 8:30 起同時進行。請從左側選擇。"},
        "scripts": ["data/workshops.js", "assets/workshops.js"],
        "ld": "WebPage",
    },
}

PAGE_BODY = {
    "about": """
  <!-- ==== Sticky section nav (auto-generated anchor pills + scrollspy) ==== -->
  <nav class="sectionnav" id="sectionNav" aria-label="Section navigation">
    <div class="sectionnav__inner" id="sectionNavInner"></div>
  </nav>
  <span id="top"></span>
  <main id="sections" aria-live="polite"></main>
""",
    "schedule": """
  <main class="page">
    <header class="page-head">
      <h1>{h1}</h1>
      <p class="page-head__sub">{sub}</p>
    </header>
    <div class="daytabs" id="daytabs" role="tablist"></div>
    <div id="program"></div>
  </main>
""",
    "papers": """
  <main class="page">
    <header class="page-head">
      <h1>{h1}</h1>
      <p class="page-head__sub">{sub}</p>
    </header>
    <section class="pfilters" id="filters" aria-label="Filters"></section>
    <div class="md md--papers">
      <div class="md__master">
        <ul class="rows" id="list" aria-label="{h1}"></ul>
      </div>
      <aside class="md__detail" id="detail"></aside>
    </div>
  </main>
""",
    "workshops": """
  <main class="page">
    <header class="page-head">
      <h1>{h1}</h1>
      <p class="page-head__sub">{sub}</p>
    </header>
    <div class="md md--workshops">
      <div class="md__master">
        <div class="filters">
          <div class="search"><span class="material-symbols-rounded" aria-hidden="true">search</span>
            <input type="search" id="q" placeholder="Search" aria-label="Search"></div>
          <div class="filter-meta"><span><b id="countN">18</b> <span id="countLabel"></span></span></div>
        </div>
        <ul class="rows" id="list" aria-label="{h1}"></ul>
      </div>
      <aside class="md__detail" id="detail"></aside>
    </div>
  </main>
""",
}


def rel_root(depth: int) -> str:
    return "../" * depth if depth else "./"


def build(page_key: str, lang: str) -> tuple[str, str]:
    p = PAGES[page_key]
    L = "zh" if lang == "zh" else "en"
    html_lang = "zh-Hant" if L == "zh" else "en"
    path = (f"{ZH_DIR}/" if L == "zh" else "") + p["slug"]          # e.g. "zh/papers/"
    depth = path.count("/")
    root = rel_root(depth)
    lang_root = root + (f"{ZH_DIR}/" if L == "zh" else "")
    other_root = root + ("" if L == "zh" else f"{ZH_DIR}/")
    url_en = f"{DOMAIN}/{p['slug']}"
    url_zh = f"{DOMAIN}/{ZH_DIR}/{p['slug']}"
    url_self = url_zh if L == "zh" else url_en
    title, desc = p["title"][L], p["desc"][L]
    other_label = "EN" if L == "zh" else "中文"
    other_aria = "Switch to English" if L == "zh" else "切換到中文版"

    ld = {
        "WebSite": f'''{{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "{title}",
    "description": "{desc}",
    "url": "{url_self}",
    "inLanguage": "{html_lang}"
  }}''',
        "WebPage": f'''{{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "{title}",
    "description": "{desc}",
    "url": "{url_self}",
    "inLanguage": "{html_lang}",
    "isPartOf": {{ "@type": "WebSite", "name": "COLM 2026 · Conference on Language Modeling", "url": "{DOMAIN}/" }}
  }}''',
    }[p["ld"]]

    body = PAGE_BODY[page_key].format(h1=p.get("h1", {}).get(L, ""), sub=p.get("sub", {}).get(L, ""))
    scripts = "\n".join(f'  <script src="{root}{s}"></script>' for s in ["assets/shell.js"] + p["scripts"])

    return path + "index.html", f"""<!DOCTYPE html>
<html lang="{html_lang}" data-theme="light">
<head>
  <!-- ==== Google Analytics 4 (Measurement ID: {GA_ID}) ==== -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{ dataLayer.push(arguments); }}
    gtag('js', new Date());
    gtag('config', '{GA_ID}');
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

  <!-- ==== Primary meta ==== -->
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{url_self}" />
  <link rel="alternate" hreflang="en" href="{url_en}" />
  <link rel="alternate" hreflang="zh-Hant" href="{url_zh}" />
  <link rel="alternate" hreflang="x-default" href="{url_en}" />
  <meta name="theme-color" content="#3C5A78" />

  <!-- ==== Open Graph / Twitter ==== -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{url_self}" />
  <meta property="og:locale" content="{'zh_TW' if L == 'zh' else 'en_US'}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{desc}" />

  <!-- ==== JSON-LD structured data ==== -->
  <script type="application/ld+json">
  {ld}
  </script>

  <!-- ==== Fonts + icons (CDN, no local files) ==== -->
  {FONTS}

  <link rel="stylesheet" href="{root}assets/styles.css" />
  <link rel="stylesheet" href="{root}assets/site.css" />
</head>
<body data-page="{page_key}" data-root="{root}">
  <!-- ==== App bar: brand · top nav · language · theme ==== -->
  <header class="appbar">
    <div class="appbar__inner">
      <button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="drawer">
        <span class="material-symbols-rounded">menu</span>
      </button>
      <a class="brand" href="{lang_root}">
        <span class="material-symbols-rounded brand__logo">dashboard</span>
        <span class="brand__name" id="brandName">COLM 2026</span>
      </a>
      <nav class="topnav" id="topnav" aria-label="Site"></nav>
      <div class="appbar__actions">
        <a class="icon-btn" id="langToggle" href="{other_root}{p['slug']}"
           hreflang="{'en' if L == 'zh' else 'zh-Hant'}" lang="{'en' if L == 'zh' else 'zh-Hant'}" rel="alternate"
           title="Language" aria-label="{other_aria}">
          <span class="material-symbols-rounded">translate</span>
          <span class="icon-btn__txt">{other_label}</span>
        </a>
        <button class="icon-btn" id="themeToggle" type="button" title="Theme" aria-label="Toggle theme">
          <span class="material-symbols-rounded" id="themeIcon">dark_mode</span>
        </button>
      </div>
    </div>
  </header>
  <div class="drawer__backdrop" id="drawerBackdrop" data-open="false"></div>
  <nav class="drawer" id="drawer" data-open="false" aria-label="Site"></nav>
{body}
  <!-- ==== Detail dialog (narrow screens + card sections) ==== -->
  <dialog class="dialog" id="dialog" aria-labelledby="dialogTitle">
    <div class="dialog__bar">
      <span class="dialog__spacer"></span>
      <button class="icon-btn" id="dialogClose" type="button" aria-label="Close">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <div class="dialog__body" id="dialogBody"></div>
  </dialog>

  <!-- ==== Footer ==== -->
  <footer class="footer">
    <p id="footerText"></p>
    <div class="profile-links" style="display:flex;gap:12px;justify-content:center;align-items:center;margin-top:10px">
      <a class="icon-btn" href="https://www.peteraim.com" target="_blank" rel="noopener" title="Home" aria-label="Back to peteraim.com">
        <span class="material-symbols-rounded">home</span>
      </a>
      <a class="icon-btn" href="https://www.linkedin.com/in/ai-med/" target="_blank" rel="noopener" title="LinkedIn" aria-label="LinkedIn (opens in new tab)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
      </a>
    </div>
    <p class="lang-alt-link" style="text-align:center;padding:4px 12px 0;font-size:.85rem">
      <a href="{other_root}{p['slug']}" hreflang="{'en' if L == 'zh' else 'zh-Hant'}" rel="alternate" lang="{'en' if L == 'zh' else 'zh-Hant'}">{'English version' if L == 'zh' else '中文版'}</a>
    </p>
  </footer>

  <！-- ==== Scripts （order matters：shell → data → page）==== -->
{scripts}
</body>
</html>
"""


REDIRECT_STUB = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>COLM 2026 — moved</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="{to}" />
  <meta http-equiv="refresh" content="0; url={to}" />
</head>
<body><p>This page moved to <a href="{to}">{to}</a>.</p></body>
</html>
"""


def sitemap_xml() -> str:
    urls = []
    for key in PAGES:
        slug = PAGES[key]["slug"]
        urls.append(f"{DOMAIN}/{slug}")
        urls.append(f"{DOMAIN}/{ZH_DIR}/{slug}")
    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n"
        f"    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"{u.replace('/' + ZH_DIR + '/', '/')}\" />\n"
        f"    <xhtml:link rel=\"alternate\" hreflang=\"zh-Hant\" href=\"{u if '/' + ZH_DIR + '/' in u else u.replace(DOMAIN + '/', DOMAIN + '/' + ZH_DIR + '/')}\" />\n"
        f"  </url>" for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            "<!--\n  Generated by scripts/build_pages.py. No <lastmod>: there is no trustworthy per-page\n"
            "  modification date, and a wrong one is worse than none. archive/ is noindex and not listed.\n-->\n"
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + body + "\n</urlset>\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=".")
    args = ap.parse_args()
    out = (ROOT / args.out) if not Path(args.out).is_absolute() else Path(args.out)
    written = []
    for key in PAGES:
        for lang in ("en", "zh"):
            rel, html = build(key, lang)
            dest = out / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(html, encoding="utf-8")
            written.append(rel)
    # legacy /en/ URL (English used to live there) → root
    stub = out / "en/index.html"
    stub.parent.mkdir(parents=True, exist_ok=True)
    stub.write_text(REDIRECT_STUB.format(to=f"{DOMAIN}/"), encoding="utf-8")
    (out / "sitemap.xml").write_text(sitemap_xml(), encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n", encoding="utf-8")
    written += ["en/index.html", "sitemap.xml", "robots.txt"]
    print("\n".join(written))


if __name__ == "__main__":
    main()
