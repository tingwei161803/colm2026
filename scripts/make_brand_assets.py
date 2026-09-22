"""Render the brand rasters: favicons + the Open Graph share card.

Why a script and not hand-made files: the OG card has to be a PNG (crawlers do
not rasterise SVG), but it wants the site's own webfonts. A plain SVG rasteriser
has no webfonts, so we render in a real browser instead and screenshot it. Same
trick as the Playwright tests this repo already runs.

    uv run --with playwright python scripts/make_brand_assets.py
    # first run only:
    uv run --with playwright playwright install chromium

Inputs : assets/favicon.svg (the mark, single source of truth)
Outputs: assets/favicon-32.png
         assets/apple-touch-icon.png   (180x180, full bleed - iOS masks corners)
         assets/icon-512.png
         assets/og-image.png           (1200x630)
"""

from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    p = Path(__file__).resolve()
    for parent in [p] + list(p.parents):
        if (parent / ".git").exists():
            return parent
    return p.parents[1]


ROOT = repo_root()
ASSETS = ROOT / "assets"

SLATE = "#3C5A78"
BONE = "#FBFBFA"
INK = "#26241F"
MUTED = "#6B6862"
RULE = "#E7E5E0"

FONTS_HREF = (
    "https://fonts.googleapis.com/css2"
    "?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600"
    "&family=Hanken+Grotesk:wght@400;500;600"
    "&family=Spline+Sans+Mono:wght@400;500"
    "&display=swap"
)

MARK = ASSETS / "favicon.svg"

STATS = [("4", "conference days"), ("18", "workshops"), ("856", "accepted papers")]


def icon_html(svg: str, *, radius: bool) -> str:
    """The mark on its own, filling the viewport. radius=False for apple-touch,
    which iOS rounds itself and which must not be transparent."""
    if not radius:
        svg = svg.replace('rx="14"', 'rx="0"')
    return f"""<!DOCTYPE html><meta charset="utf-8">
<style>
  html, body {{ margin: 0; height: 100%; }}
  svg {{ display: block; width: 100vw; height: 100vh; }}
</style>
{svg}"""


def og_html() -> str:
    mark = MARK.read_text(encoding="utf-8")
    stats = "".join(
        f'<div class="stat"><b>{n}</b><span>{label}</span></div>' for n, label in STATS
    )
    return f"""<!DOCTYPE html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS_HREF}" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; }}
  body {{
    width: 1200px; height: 630px;
    background: {BONE}; color: {INK};
    font-family: "Hanken Grotesk", system-ui, sans-serif;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 80px 56px;
    /* the slate spine echoes the app bar accent */
    border-left: 14px solid {SLATE};
  }}
  .eyebrow {{
    font-family: "Spline Sans Mono", ui-monospace, monospace;
    font-size: 21px; letter-spacing: .14em; text-transform: uppercase;
    color: {SLATE};
  }}
  h1 {{
    font-family: "Newsreader", Georgia, serif;
    font-weight: 600; font-size: 134px; line-height: .96;
    letter-spacing: -.025em; margin: 26px 0 22px;
  }}
  .sub {{
    font-family: "Newsreader", Georgia, serif;
    font-size: 40px; line-height: 1.3; color: {MUTED}; max-width: 880px;
  }}
  .foot {{ border-top: 1px solid {RULE}; padding-top: 26px;
           display: flex; align-items: flex-end; justify-content: space-between; }}
  .stats {{ display: flex; gap: 64px; }}
  .stat b {{
    display: block; font-family: "Newsreader", Georgia, serif;
    font-weight: 600; font-size: 46px; line-height: 1;
  }}
  .stat span {{
    display: block; margin-top: 8px;
    font-family: "Spline Sans Mono", ui-monospace, monospace;
    font-size: 15px; letter-spacing: .1em; text-transform: uppercase; color: {MUTED};
  }}
  .site {{ display: flex; align-items: center; gap: 12px;
           font-size: 19px; color: {MUTED}; }}
  .site svg {{ width: 34px; height: 34px; }}
</style>
<div>
  <div class="eyebrow">Oct 6&ndash;9, 2026 &middot; Hilton Union Square, San Francisco</div>
  <h1>COLM 2026</h1>
  <div class="sub">The 3rd Conference on Language Modeling &mdash; an unofficial
    bilingual guide to the program, every accepted paper and all 18 workshops.</div>
</div>
<div class="foot">
  <div class="stats">{stats}</div>
  <div class="site">{mark}colm2026.peteraim.com</div>
</div>"""


def main() -> None:
    from playwright.sync_api import sync_playwright

    svg = MARK.read_text(encoding="utf-8")
    jobs = [
        ("favicon-32.png", 32, 32, icon_html(svg, radius=True), True),
        ("apple-touch-icon.png", 180, 180, icon_html(svg, radius=False), False),
        ("icon-512.png", 512, 512, icon_html(svg, radius=True), True),
        ("og-image.png", 1200, 630, og_html(), False),
    ]

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, w, h, html, transparent in jobs:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.set_content(html, wait_until="load")
            page.evaluate("async () => { await document.fonts.ready; }")
            out = ASSETS / name
            page.screenshot(path=out, omit_background=transparent)
            page.close()
            print(f"  {name:22s} {w}x{h}  {out.stat().st_size / 1024:6.1f} KB")
        browser.close()


if __name__ == "__main__":
    main()
