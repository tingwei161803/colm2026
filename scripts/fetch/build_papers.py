"""Merge colm.cc bulk JSON + abstracts JSON + AcceptedPapers listing into papers.json / papers-meta.json.
Run from tmp/data/:  uv run python scripts/build_papers.py"""
import html, json, re, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw"

bulk = json.load(open(RAW / "colm-2026-orals-posters.json", encoding="utf-8"))["results"]
abstracts = json.load(open(RAW / "colm-2026-abstracts.json", encoding="utf-8"))
listing = json.load(open(RAW / "accepted-papers-parsed.json", encoding="utf-8"))

def norm(t: str) -> str:
    t = html.unescape(t).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def clean(s):
    if s is None:
        return None
    for _ in range(3):  # a few source strings are double-escaped (e.g. "D&amp;#x27;souza")
        u = html.unescape(s)
        if u == s:
            break
        s = u
    s = re.sub(r"\s+", " ", s).strip()
    return s or None

def fmt_time(iso: str) -> str:
    dt = datetime.fromisoformat(iso)
    h = dt.strftime("%I").lstrip("0")
    return f"{h}:{dt.strftime('%M %p')} PDT"

by_id = {e["id"]: e for e in bulk}
posters = [e for e in bulk if e["eventtype"] == "Poster"]
orals = [e for e in bulk if e["eventtype"] == "Oral"]
oral_by_poster = {}
for o in orals:
    assert len(o["related_events_ids"]) == 1
    oral_by_poster[o["related_events_ids"][0]] = o

listing_by_norm = {}
for row in listing:
    listing_by_norm.setdefault(norm(row["title"]), []).append(row)

unmatched_listing = set(listing_by_norm)
mismatches, papers = [], []
for e in posters:
    title = clean(e["name"])
    key = norm(title)
    rows = listing_by_norm.get(key, [])
    row = None
    if len(rows) == 1:
        row = rows[0]
    elif len(rows) > 1:
        # disambiguate by session + poster position
        cand = [r for r in rows if r["session"] == e["session"] and r["posterLocation"] == e["poster_position"]]
        row = cand[0] if cand else None
    if row:
        unmatched_listing.discard(key)
    else:
        mismatches.append(("no-listing-row", e["id"], title))

    forum = re.search(r"id=([A-Za-z0-9_-]+)$", e["paper_url"]).group(1)
    authors = [clean(a["fullname"]) for a in e["authors"]]
    affs = [clean(a.get("institution")) for a in e["authors"]]
    if row and row["authors"] != authors:
        mismatches.append(("author-diff", e["id"], row["authors"], authors))

    start = datetime.fromisoformat(e["starttime"])
    ps = int(re.search(r"(\d+)$", e["session"]).group(1))
    room = e["room_name"]
    pos = int(e["poster_position"].lstrip("#"))
    time_printed = row["time"] if row else fmt_time(e["starttime"])
    if row:
        if row["room"] != room: mismatches.append(("room-diff", e["id"], row["room"], room))
        if row["posterLocation"] != e["poster_position"]: mismatches.append(("pos-diff", e["id"], row["posterLocation"], e["poster_position"]))
        if row["session"] != e["session"]: mismatches.append(("session-diff", e["id"], row["session"], e["session"]))
        if row["time"] != fmt_time(e["starttime"]): mismatches.append(("time-diff", e["id"], row["time"], fmt_time(e["starttime"])))

    o = oral_by_poster.get(e["id"])
    project = clean(e["url"]) or (row["project"] if row else None)
    if row and row["project"] and e["url"] and row["project"] != e["url"]:
        mismatches.append(("project-diff", e["id"], row["project"], e["url"]))

    links = {
        "colm": "https://colm.cc" + e["virtualsite_url"],
        "openreview": e["paper_url"],
        "pdf": f"https://openreview.net/pdf?id={forum}",
    }
    if project:
        links["project"] = project
    for m in e["eventmedia"]:
        if m["name"] == "Poster" and m.get("file") and m.get("visible") and m.get("detailed_kind") != "thumb":
            links["poster"] = "https://colm.cc" + m["file"]   # uploaded poster image (PNG)
        elif m["name"] == "Slides" and m.get("uri"):
            links["slides"] = m["uri"]

    paper = {
        "id": forum,
        "colmId": e["id"],
        "title": title,
        "authors": authors,
        "affiliations": affs,
        "abstract": clean(abstracts.get(str(e["id"]))),
        "topic": None,
        "keywords": None,
        "oral": o is not None,
        "oralSession": o["session"] if o else None,
        "oralDay": o["starttime"][:10] if o else None,
        "oralTime": fmt_time(o["starttime"]) if o else None,
        "oralRoom": o["room_name"] if o else None,
        "posterSession": ps,
        "day": start.strftime("%Y-%m-%d"),
        "time": time_printed,
        "room": room,
        "posterNumber": pos,
        "links": links,
    }
    papers.append(paper)

papers.sort(key=lambda p: (p["posterSession"], p["posterNumber"]))

for key in unmatched_listing:
    mismatches.append(("listing-row-unmatched", key))

(DATA / "papers.json").write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def pct(n): return round(100 * n / len(papers), 1)
counts = {
    "total": len(papers),
    "oral": sum(p["oral"] for p in papers),
    "withAbstract": sum(1 for p in papers if p["abstract"]),
    "withTopic": sum(1 for p in papers if p["topic"]),
    "withKeywords": sum(1 for p in papers if p["keywords"]),
    "withAffiliations": sum(1 for p in papers if p["affiliations"] and all(p["affiliations"])),
    "withAnyAffiliation": sum(1 for p in papers if p["affiliations"] and any(p["affiliations"])),
    "authorsTotal": sum(len(p["authors"]) for p in papers),
    "authorsWithAffiliation": sum(1 for p in papers for a in p["affiliations"] if a),
    "withRoom": sum(1 for p in papers if p["room"]),
    "withPosterNumber": sum(1 for p in papers if p["posterNumber"]),
    "withProjectLink": sum(1 for p in papers if p["links"].get("project")),
    "withPosterFile": sum(1 for p in papers if p["links"].get("poster")),
    "withSlides": sum(1 for p in papers if p["links"].get("slides")),
}
sessions = []
for (ps, day, time), n in sorted(Counter((p["posterSession"], p["day"], p["time"]) for p in papers).items()):
    sessions.append({"posterSession": ps, "day": day, "time": time, "count": n,
                     "rooms": dict(sorted(Counter(p["room"] for p in papers if p["posterSession"] == ps).items()))})
oral_sessions = []
for (s, day, room), n in sorted(Counter((p["oralSession"], p["oralDay"], p["oralRoom"]) for p in papers if p["oral"]).items()):
    times = sorted(p["oralTime"] for p in papers if p["oralSession"] == s)
    oral_sessions.append({"oralSession": s, "day": day, "room": room, "count": n, "talkTimes": times})
meta = {
    "fetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "conference": {"name": "COLM 2026 (Third Conference on Language Modeling)", "dates": "2026-10-06/2026-10-09",
                   "location": "San Francisco, USA", "timezone": "America/Los_Angeles"},
    "sources": [
        "https://colm.cc/static/virtual/data/colm-2026-orals-posters.json",
        "https://colm.cc/static/virtual/data/colm-2026-abstracts.json",
        "https://colm.cc/Conferences/2026/AcceptedPapers",
        "https://colm.cc/virtual/2026/papers.html",
        "https://api2.openreview.net/groups?id=colmweb.org/COLM/2026/Conference",
    ],
    "counts": counts,
    "coveragePct": {k: pct(v) for k, v in counts.items() if k.startswith("with") or k == "oral"},
    "topics": [],
    "rooms": [{"room": r, "count": n} for r, n in Counter(p["room"] for p in papers).most_common()],
    "sessions": sessions,
    "oralSessions": oral_sessions,
    "notes": [
        "topic and keywords are null for every paper: colm.cc exposes no topics ('No topics available') and the OpenReview notes API is behind a Cloudflare Turnstile challenge (HTTP 403 ChallengeRequiredError) for anonymous clients.",
        "Every oral paper also has a poster slot; posterSession/day/time/room/posterNumber describe the poster slot, oralSession/oralDay/oralTime/oralRoom describe the 15-minute talk.",
        "links.pdf is derived from the OpenReview forum id (https://openreview.net/pdf?id=<id>), not fetched.",
        "affiliations come from the colm.cc author records (one institution string per author, HTML-unescaped).",
    ],
}
(DATA / "papers-meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(RAW / "merge-mismatches.json").write_text(json.dumps(mismatches, indent=1, ensure_ascii=False), encoding="utf-8")
print(json.dumps(counts, indent=1))
print("mismatches", Counter(m[0] for m in mismatches))
for m in mismatches[:15]:
    print(" ", m)
