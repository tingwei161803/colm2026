"""colm.cc workshop paper lists (raw, keyed by colm.cc workshop id) → data-src/workshop-papers.json.

    uv run python scripts/fetch/build_workshop_papers.py tmp/workshop-papers-raw.json

The raw file comes from colm_workshop_papers.js (run in a logged-in browser). Keys are mapped to
this site's workshop ids through `colmUrl` in data-src/workshops.json; an unknown key is an error.
Chinese titles live separately in data-src/workshop-papers-zh.json ({colmId: title}).
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# rows colm.cc lists among the papers that are really schedule items (NonAR-LM, HAIPS)
SCHEDULE_ITEM = re.compile(r"^(opening remarks|closing remarks|invited talk \d|keynote speaker|lunch$|coffee and poster session|"
                           r"contributed talks|panel discussion)", re.I)


def norm(title: str) -> str:
    return re.sub(r"\W+", " ", title.lower()).strip()


def clean_authors(authors: list[str]) -> list[str]:
    return [a for a in (x.strip(" ⋅\u00a0") for x in authors) if a]


def tidy(papers: list[dict], authors_by_title: dict) -> tuple[list[dict], list[str]]:
    """Drop schedule items; merge repeats of one title (colm.cc lists some papers twice: once under a
    poster session without authors, once in a plain list with authors); fill missing authors from the
    same title in another workshop."""
    out, by_title, dropped = [], {}, []
    for p in papers:
        if SCHEDULE_ITEM.match(p["title"]):
            dropped.append(p["title"])
            continue
        p = {**p, "authors": clean_authors(p["authors"])}
        k = norm(p["title"])
        if k in by_title:
            q = by_title[k]
            if not q["authors"] and p["authors"]:
                q["authors"], q["colmId"] = p["authors"], p["colmId"]     # keep the id of the full entry
            q["session"] = q["session"] or p.get("session")
            continue
        by_title[k] = p
        out.append(p)
    for p in out:
        if not p["authors"]:
            p["authors"] = authors_by_title.get(norm(p["title"]), [])
    return out, dropped


def main() -> None:
    raw = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    workshops = json.loads((ROOT / "data-src/workshops.json").read_text(encoding="utf-8"))
    by_colm = {w["colmUrl"].rsplit("/", 1)[-1]: w["id"] for w in workshops}
    authors_by_title = {norm(p["title"]): clean_authors(p["authors"]) for w in raw.values() for p in w["papers"] if clean_authors(p["authors"])}
    out = {}
    for colm_id, w in sorted(raw.items(), key=lambda kv: by_colm.get(str(kv[0]), "")):
        site_id = by_colm.get(str(colm_id))
        if not site_id:
            raise SystemExit(f"colm.cc workshop {colm_id} is not in workshops.json")
        papers, dropped = tidy([{"colmId": p["colmId"], "title": p["title"], "authors": p["authors"], "session": p.get("session")}
                                for p in w["papers"]], authors_by_title)
        ids = [p["colmId"] for p in papers]
        assert len(ids) == len(set(ids)), f"duplicate colmId in {site_id}"
        out[site_id] = {"colmWorkshopId": int(colm_id), "papers": papers}
        print(f"{site_id:32} {len(w['papers']):4} rows → {len(papers):4} papers  {sum(1 for p in papers if p['session'])} with a session"
              + (f"  (dropped {len(dropped)} schedule items)" if dropped else "")
              + (f"  [{sum(1 for p in papers if not p['authors'])} without authors]" if any(not p["authors"] for p in papers) else ""))
    doc = {"_comment": "Accepted papers per workshop, from the logged-in colm.cc workshop pages "
                       "(scripts/fetch/colm_workshop_papers.js → build_workshop_papers.py). "
                       "session = the timed schedule row the paper is nested under, or null when colm.cc lists it without one.",
           "fetched": date.today().isoformat(),
           "workshops": out}
    dest = ROOT / "data-src/workshop-papers.json"
    dest.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {dest.relative_to(ROOT)}: {sum(len(w['papers']) for w in out.values())} papers")


if __name__ == "__main__":
    main()
