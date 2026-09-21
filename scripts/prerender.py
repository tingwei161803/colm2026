"""Bake the JS-rendered content into the static HTML so crawlers and no-JS
readers see real text (the page scripts repaint on load regardless).

Runs a throw-away local server, opens every page with Playwright, and copies the
rendered innerHTML of the content region into the generated shell:

  about      #sections
  schedule   #daytabs, #program
  papers     #filters, #list
  workshops  #list

Runtime state that must not be frozen (selected rows, expanded dialog) is
stripped. Run AFTER build_pages.py — that script writes clean shells.

Usage:  uv run --with playwright python scripts/prerender.py
"""
from __future__ import annotations

import re
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "index.html": ["sections"],
    "schedule/index.html": ["daytabs", "program"],
    "papers/index.html": ["filters", "list"],
    "workshops/index.html": ["list"],
}


def free_port() -> int:
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def clean(html: str) -> str:
    html = html.replace(' aria-current="true"', ' aria-current="false"')
    html = re.sub(r' aria-pressed="true"', ' aria-pressed="false"', html)
    return html


def main() -> None:
    port = free_port()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
                           cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            for rel, ids in PAGES.items():
                for prefix in ("", "zh/"):
                    path = prefix + rel
                    page.goto(f"http://127.0.0.1:{port}/{path}", wait_until="networkidle")
                    page.wait_for_timeout(300)
                    # scroll through so reveal-on-scroll marks everything visible
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(150)
                    page.evaluate("window.scrollTo(0, 0)")
                    f = ROOT / path
                    html = f.read_text(encoding="utf-8")
                    for el_id in ids:
                        inner = page.evaluate("id => document.getElementById(id) ? document.getElementById(id).innerHTML : null", el_id)
                        if inner is None:
                            print(f"  !! #{el_id} not found on {path}"); continue
                        # the shell has the element empty on one line: <tag ... id="x" ...></tag>
                        pat = re.compile(r'(<(\w+)[^>]*\bid="' + re.escape(el_id) + r'"[^>]*>)(</\2>)')
                        if not pat.search(html):
                            print(f"  !! empty #{el_id} not found in shell {path} (already prerendered?)"); continue
                        html = pat.sub(lambda m: m.group(1) + "\n" + clean(inner) + "\n" + m.group(3), html, count=1)
                    f.write_text(html, encoding="utf-8")
                    print(f"prerendered {path}  ({f.stat().st_size // 1024} KB)")
            browser.close()
    finally:
        srv.terminate()


if __name__ == "__main__":
    main()
