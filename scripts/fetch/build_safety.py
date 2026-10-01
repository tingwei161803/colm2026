"""SFPD 事件報告（DataSF 開放資料）→ data-src/safety.json：地圖上的「治安熱區」格點

資料集：Police Department Incident Reports: 2018 to Present（wg3w-h783）
  https://data.sfgov.org/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783

只取「走在路上的人」會碰到的類型，分成三組；店家失竊、車上財物、闖空門、偷車這些
跟行人安全關係不大，而且 Union Square 商圈的順手牽羊會把熱區整個拉歪，所以不算。

  violent  暴力：傷害（含重傷害）、搶劫、凶殺、性犯罪、持有 / 攜帶武器
  drug     毒品：Drug Offense —— 當作露天用藥與交易現場的指標
  theft    扒竊：扒手、搶皮包、其他竊盜

每個事件落進約 110 m × 110 m 的格子，一格輸出
  [緯度, 經度, violent, drug, theft, night]
night = 這格裡發生在 20:00–05:59 的事件數（三組合計）。要怎麼把這幾個數字
合成一個「危險程度」由前端決定（assets/map.js 的 cellWeight），這裡只給原始計數。

Usage（在 repo 根目錄）:
    uv run --with certifi python scripts/fetch/build_safety.py              # 最近 365 天
    uv run --with certifi python scripts/fetch/build_safety.py --days 180
"""
from __future__ import annotations

import argparse
import json
import ssl
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:                                    # uv 裝的 Python 不讀 macOS 鑰匙圈，用 certifi 的 CA
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CTX = ssl.create_default_context()

ROOT = Path(__file__).resolve().parents[2]
API = "https://data.sf.gov/resource/wg3w-h783.json"          # data.sfgov.org 現在 301 到這裡
DATASET_URL = "https://data.sfgov.org/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783"

# 涵蓋試算表裡所有地點（西到 Sutro Baths、南到 La Taqueria / Khao Tiew）
BBOX = {"south": 37.735, "north": 37.815, "west": -122.52, "east": -122.385}
CELL_LAT = 0.001        # ≈ 111 m
CELL_LNG = 0.00125      # ≈ 110 m（北緯 37.8°）
MIN_TOTAL = 3           # 一年少於 3 件的格子不輸出，檔案小很多、地圖也不會滿天星

GROUPS = {
    "violent": {
        "Assault": None,                                   # None = 全部子類別
        "Robbery": {"Robbery - Street", "Robbery - Other", "Robbery - Commercial", "Robbery - Carjacking"},
        "Homicide": None, "Sex Offense": None, "Rape": None,
        "Weapons Offense": None, "Weapons Carrying Etc": None,
    },
    "drug": {"Drug Offense": None, "Drug Violation": None},
    "theft": {"Larceny Theft": {"Larceny Theft - Pickpocket", "Larceny Theft - Purse Snatch", "Larceny Theft - Other"}},
}
ORDER = ["violent", "drug", "theft"]


def group_of(cat: str | None, sub: str | None) -> str | None:
    for g, cats in GROUPS.items():
        if cat in cats and (cats[cat] is None or sub in cats[cat]):
            return g
    return None


def soql(params: dict) -> list[dict]:
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "colm2026-site/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
        return json.loads(r.read())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--out", default=str(ROOT / "data-src/safety.json"))
    a = ap.parse_args()

    until = datetime.now(timezone.utc).date()
    since = until - timedelta(days=a.days)
    cats = sorted({c for g in GROUPS.values() for c in g})
    where = (f"incident_datetime >= '{since}T00:00:00' AND incident_datetime < '{until}T00:00:00'"
             f" AND latitude between {BBOX['south']} and {BBOX['north']}"
             f" AND longitude between {BBOX['west']} and {BBOX['east']}"
             " AND incident_category in (" + ",".join("'" + c + "'" for c in cats) + ")")

    rows, offset, page = [], 0, 50000
    while True:
        batch = soql({"$select": "incident_id,incident_category,incident_subcategory,incident_time,latitude,longitude",
                      "$where": where, "$order": ":id", "$limit": page, "$offset": offset})
        rows += batch
        print(f"  抓到 {len(rows)} 筆…")
        if len(batch) < page:
            break
        offset += page

    # 同一事件可能有多列（一案多個罪名）：同一組只算一次
    seen: set[tuple[str, str]] = set()
    cells: dict[tuple[int, int], list[int]] = defaultdict(lambda: [0, 0, 0, 0])
    kept = 0
    for r in rows:
        g = group_of(r.get("incident_category"), r.get("incident_subcategory"))
        if not g or not r.get("latitude"):
            continue
        key = (r.get("incident_id") or "", g)
        if key in seen:
            continue
        seen.add(key)
        lat, lng = float(r["latitude"]), float(r["longitude"])
        ci = (int((lat - BBOX["south"]) / CELL_LAT), int((lng - BBOX["west"]) / CELL_LNG))
        c = cells[ci]
        c[ORDER.index(g)] += 1
        hour = int((r.get("incident_time") or "12:00")[:2])
        if hour >= 20 or hour < 6:
            c[3] += 1
        kept += 1

    out = []
    for (i, j), (v, d, t, n) in sorted(cells.items()):
        if v + d + t < MIN_TOTAL:
            continue
        lat = round(BBOX["south"] + (i + 0.5) * CELL_LAT, 5)
        lng = round(BBOX["west"] + (j + 0.5) * CELL_LNG, 5)
        out.append([lat, lng, v, d, t, n])

    data = {
        "meta": {
            "source": "SFPD Incident Reports (DataSF, dataset wg3w-h783)",
            "url": DATASET_URL,
            "from": str(since), "to": str(until - timedelta(days=1)),
            "incidents": kept,
            "cell": {"lat": CELL_LAT, "lng": CELL_LNG, "meters": 110},
            "fields": ["lat", "lng", "violent", "drug", "theft", "night"],
            "groups": {g: {c: (sorted(s) if s else "all") for c, s in cats_.items()} for g, cats_ in GROUPS.items()},
        },
        "cells": out,
    }
    Path(a.out).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tot = [sum(c[k] for c in out) for k in range(2, 6)]
    print(f"safety.json  {len(out)} 格 / {kept} 件  violent={tot[0]} drug={tot[1]} theft={tot[2]} night={tot[3]}"
          f"  ({since} → {until - timedelta(days=1)})")


if __name__ == "__main__":
    main()
