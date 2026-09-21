"""Parse https://colm.cc/Conferences/2026/AcceptedPapers (raw/accepted-papers.html)
into raw/accepted-papers-parsed.json: one row per table row with title, authors,
project link, room, poster location, printed time, session."""
import html, json, re, sys
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "raw"
src = (RAW / "accepted-papers.html").read_text(encoding="utf-8")

table = src.split('class="elc-table"', 1)[1]
rows = re.findall(r"<tr(?:\s[^>]*)?>(.*?)</tr>", table, flags=re.S)
out = []
for row in rows:
    if "elc-head" in row or "<strong>" not in row:
        continue
    title = re.search(r"<strong>(.*?)</strong>", row, re.S).group(1)
    m = re.search(r'<a href="([^"]+)"[^>]*class="elc-project-link"', row)
    project = html.unescape(m.group(1)) if m else None
    a = re.search(r'<div class="indented">\s*<i>(.*?)</i>', row, re.S)
    authors = [html.unescape(x.strip()) for x in a.group(1).split("⋅")] if a else []
    kw = re.search(r'<td class="elc-keywords">(.*?)</td>', row, re.S)
    keywords = re.sub(r"<[^>]+>", " ", kw.group(1)).split() if kw else []
    parts = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", p))).strip()
             for p in re.findall(r'<span class="elc-where-part">(.*?)</span>', row, re.S)]
    rec = {"title": html.unescape(re.sub(r"\s+", " ", title)).strip(), "authors": authors,
           "project": project, "keywords": keywords, "whereParts": parts,
           "room": None, "posterLocation": None, "time": None, "session": None}
    for p in parts:
        if p.startswith("In Room:"):
            rec["room"] = p[len("In Room:"):].strip()
        elif p.startswith("Poster Location:"):
            rec["posterLocation"] = p[len("Poster Location:"):].strip()
        elif p.startswith("at "):
            rec["time"] = re.sub(r"\s*\(America/Los_Angeles\)", "", p[3:]).strip()
        elif p.startswith("in ") and "Session" in p:
            rec["session"] = p[3:].rstrip(".").strip()
    out.append(rec)

(RAW / "accepted-papers-parsed.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print("rows", len(out), "with project", sum(1 for r in out if r["project"]),
      "with keywords", sum(1 for r in out if r["keywords"]),
      "missing room/pos/time/session", [sum(1 for r in out if not r[k]) for k in ("room", "posterLocation", "time", "session")])
from collections import Counter
print(Counter((r["session"], r["time"]) for r in out))
