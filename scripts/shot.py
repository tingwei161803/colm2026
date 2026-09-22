"""Smoke-test the template pages: console errors + screenshots (desktop & phone).

Usage: uv run --with playwright python scripts/shot.py [base] [paths...]
       default base = http://127.0.0.1:4173  paths = all 8 pages
Screenshots land in tmp/shots/<name>-{desktop,phone}.png
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp/shots"   # gitignored
OUT.mkdir(parents=True, exist_ok=True)

base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173"
paths = sys.argv[2:] or ["/", "/zh/", "/schedule/", "/zh/schedule/", "/papers/", "/zh/papers/", "/workshops/", "/zh/workshops/"]

# per-page interaction before the screenshot (so the detail panel is populated)
def interact(page, path: str) -> None:
    if path.rstrip("/") in ("", "/zh"):
        # home: scroll through so IntersectionObserver reveals every section
        h = page.evaluate("document.body.scrollHeight")
        for y in range(0, h, 500):
            page.evaluate(f"window.scrollTo(0, {y})"); page.wait_for_timeout(40)
        page.evaluate("window.scrollTo(0, 0)"); page.wait_for_timeout(200)
    if "papers" in path:
        page.locator("#list .row").first.click()
        page.wait_for_timeout(200)
    elif "workshops" in path:
        page.locator("#list .row").first.click()
        page.wait_for_timeout(200)
    elif "schedule" in path:
        page.locator("details").first.click() if page.locator("details").count() else None
        page.wait_for_timeout(200)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    bad = 0
    for path in paths:
        name = (path.strip("/") or "home").replace("/", "-")
        for label, vp in (("desktop", {"width": 1280, "height": 900}), ("phone", {"width": 390, "height": 844})):
            ctx = browser.new_context(viewport=vp, device_scale_factor=1)
            page = ctx.new_page()
            errors: list[str] = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base + path, wait_until="networkidle")
            page.wait_for_timeout(300)
            try:
                interact(page, path)
            except Exception as e:  # noqa: BLE001
                errors.append(f"interact: {e}")
            page.screenshot(path=str(OUT / f"{name}-{label}.png"), full_page=(label == "desktop" and "papers" not in path))
            # filter out font/CDN noise that is irrelevant offline
            real = [e for e in errors if "fonts.g" not in e and "googletagmanager" not in e and "ERR_INTERNET" not in e]
            status = "OK " if not real else "ERR"
            bad += bool(real)
            print(f"{status} {path:16s} {label:7s} {page.title()[:50]!r}")
            for e in real:
                print("     -", e[:300])
            ctx.close()
    browser.close()
    sys.exit(1 if bad else 0)
