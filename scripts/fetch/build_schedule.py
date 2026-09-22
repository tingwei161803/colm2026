"""Build tmp/data/schedule.json for COLM 2026 from the raw downloads in
tmp/data/raw/schedule/.

Run:  uv run --with beautifulsoup4 --with lxml python tmp/data/scripts/build_schedule.py

Inputs (all under raw/schedule/):
  site/site_Conferences_2026_Schedule.html  official schedule grid (948 cards incl. breaks/socials/registration)
  calendar.html                              virtual-site calendar (colm.cc detail URLs for remarks/keynotes/panel)
  colm-2026-orals-posters.json               bulk JSON: 880 accepted papers with session/room/time
  ev_events_session.html                     sessions listing (poster room -> poster-number ranges)
  detail/workshop_*.html                     workshop detail pages (organizers, project page, abstract)
  dates.html                                 official key dates page
  ../../scripts/speakers.json                keynote/panelist affiliations (NOT from colm.cc; see NOTES)
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

DATA = Path(__file__).resolve().parents[1]
RAW = DATA / "raw" / "schedule"
OUT = DATA / "schedule.json"

BASE = "https://colm.cc"
YEAR = 2026
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
WEEKDAYS = {"Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
            "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday", "Sun": "Sunday"}


def soup_of(path: Path) -> BeautifulSoup:
    return BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")


def slugify(s: str) -> str:
    s = s.lower()
    s = s.replace("×", "x").replace("'", "").replace("’", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def to_24h(s: str) -> str:
    """'02:30 PM' -> '14:30'"""
    return datetime.strptime(s.strip(), "%I:%M %p").strftime("%H:%M")


# ---------------------------------------------------------------------------
# 1. colm.cc virtual calendar: title -> detail URL (for cards without ids)
# ---------------------------------------------------------------------------
def calendar_links() -> dict[str, str]:
    soup = soup_of(RAW / "calendar.html")
    links: dict[str, str] = {}
    for a in soup.select("div.eventsession a[href], div.sessiontitle a[href]"):
        href = a["href"]
        if not re.match(r"^/virtual/2026/(remarks|invited-talk|panel|session|workshop)/\d+$", href):
            continue
        title = a.get_text(" ", strip=True)
        title = re.sub(r"\s*\[\d{1,2}:\d{2}-\d{1,2}:\d{2}\]\s*$", "", title)  # strip "[10:00-11:00]"
        links[title] = BASE + href
    return links


# ---------------------------------------------------------------------------
# 2. Papers JSON: oral papers per session, poster counts/rooms per session
# ---------------------------------------------------------------------------
def load_papers():
    data = json.loads((RAW / "colm-2026-orals-posters.json").read_text(encoding="utf-8"))["results"]
    by_id = {r["id"]: r for r in data}
    orals: dict[int, list] = defaultdict(list)    # parent session id -> oral records
    posters: dict[int, list] = defaultdict(list)  # parent session id -> poster records
    for r in data:
        if r["eventtype"] == "Oral":
            orals[r["parent_id"]].append(r)
        elif r["eventtype"] == "Poster":
            posters[r["parent_id"]].append(r)
    for lst in orals.values():
        lst.sort(key=lambda r: r["starttime"])
    return by_id, orals, posters


def oral_paper_entry(r: dict, by_id: dict) -> dict:
    # The oral record has no OpenReview link; its related poster record does.
    poster = next((by_id[i] for i in r.get("related_events_ids", []) if i in by_id), None)
    return {
        "title": r["name"].strip(),
        "authors": [a["fullname"] for a in r["authors"]],
        "authorAffiliations": [a.get("institution") for a in r["authors"]],
        "start": r["starttime"][11:16],
        "end": r["endtime"][11:16],
        "colmUrl": BASE + r["virtualsite_url"],
        "openreviewUrl": (poster or {}).get("paper_url") or None,
        "paperId": poster["id"] if poster else None,          # id used by colm-2026-abstracts.json / poster pages
        "posterSession": poster["session"] if poster else None,
        "posterRoom": poster["room_name"] if poster else None,
        "posterPosition": poster["poster_position"] if poster else None,
    }


# ---------------------------------------------------------------------------
# 3. Sessions listing page: poster room -> poster-number ranges
# ---------------------------------------------------------------------------
def poster_room_ranges() -> dict[int, list[dict]]:
    soup = soup_of(RAW / "ev_events_session.html")
    out: dict[int, list[dict]] = {}
    for card in soup.select("div.event-card"):
        a = card.select_one("h3.event-title a[href]")
        if not a:
            continue
        m = re.search(r"/session/(\d+)", a["href"])
        if not m:
            continue
        sid = int(m.group(1))
        text = card.get_text(" ", strip=True)
        # e.g. "Imperial Ballroom (#1-73), Franciscan A (#74-80), ..., Grand Ballroom (#101-145)"
        ranges = re.findall(r"([A-Z][a-z]+ Ballroom|Franciscan [A-D]|Yosemite Foyer) \((#\d+-\d+)\)", text)
        if ranges:
            out[sid] = [{"room": room.strip(), "posters": rng} for room, rng in ranges]
    return out


# ---------------------------------------------------------------------------
# 4. Workshop detail pages
# ---------------------------------------------------------------------------
def workshops_detail() -> dict[int, dict]:
    out: dict[int, dict] = {}
    for path in sorted((RAW / "detail").glob("workshop_*.html")):
        wid = int(re.search(r"workshop_(\d+)", path.name).group(1))
        soup = soup_of(path)
        card = soup.find(class_="hero-card")
        title = card.find(class_="event-title").get_text(" ", strip=True)
        org_el = card.find(class_="event-organizers")
        organizers = [o.strip() for o in org_el.get_text(" ", strip=True).split("⋅")] if org_el else []
        organizers = [o for o in organizers if o]
        proj = card.find("a", class_=re.compile(r"\bproject\b"))
        ab = card.find(class_="abstract-text-inner")
        abstract = None
        if ab:
            paras = []
            for p in ab.find_all("p") or [ab]:
                t = p.get_text("\n", strip=True)
                if t:
                    paras.append(t)
            abstract = "\n\n".join(paras) or None
        out[wid] = {
            "title": title,
            "organizers": organizers,
            "projectUrl": proj["href"] if proj else None,
            "abstract": abstract,
        }
    return out


# ---------------------------------------------------------------------------
# 5. Official schedule grid (Conferences/2026/Schedule)
# ---------------------------------------------------------------------------
HDR_RX = re.compile(
    r"^(?P<wd>\w{3}) (?P<mon>\w{3}) (?P<day>\d{2}) (?P<start>\d{2}:\d{2} [AP]M) -- (?P<end>\d{2}:\d{2} [AP]M) "
    r"\((?P<tz>\w+)\)\s*(?:@\s*(?P<room>.*?))?\s*(?:None|#\d+)?\s*$"
)

TYPE_MAP = {
    "remarks": "remarks",
    "invited-talk": "keynote",
    "panel": "panel",
    "break": "break",
    "social": "social",
    "workshop": "workshop",
    "registration-desk": "other",
    "expo-talk-panel": "other",
}


def schedule_cards() -> list[dict]:
    soup = soup_of(RAW / "site" / "site_Conferences_2026_Schedule.html")
    cards = []
    for c in soup.find_all("div", class_=re.compile(r"^maincard narrower")):
        cls = c["class"][-1]
        if cls in ("poster", "oral"):
            continue  # individual papers: handled through the JSON
        hdrs = c.find_all("div", class_="maincardHeader")
        type_label = hdrs[0].get_text(" ", strip=True)
        when = hdrs[1].get_text(" ", strip=True)
        m = HDR_RX.match(when)
        if not m:
            raise ValueError(f"unparsed header: {when!r}")
        title = c.find(class_="maincardBody").get_text(" ", strip=True)
        footer = c.find(class_="maincardFooter").get_text(" ", strip=True)
        cid = c.get("id", "")
        num = int(cid.split("_")[1]) if cid.split("_")[1].isdigit() else None
        date = f"{YEAR}-{MONTHS[m['mon']]:02d}-{int(m['day']):02d}"
        cards.append({
            "cls": cls,
            "siteType": type_label,
            "date": date,
            "weekday": WEEKDAYS[m["wd"]],
            "start": to_24h(m["start"]),
            "end": to_24h(m["end"]),
            "tz": m["tz"],
            "room": (m["room"] or "").strip() or None,
            "title": title,
            "footer": footer or None,
            "num": num,
        })
    return cards


# ---------------------------------------------------------------------------
# 6. Key dates page
# ---------------------------------------------------------------------------
DATE_RX = re.compile(r"^(?P<mon>\w{3}) (?P<day>\d{2}) '(?P<yy>\d{2})(?: (?P<time>\d{2}:\d{2} [AP]M) (?P<tz>[A-Z]+))?(?: \((?P<aoe>Anywhere on Earth)\))?$")


def parse_date_cell(raw: str) -> dict:
    m = DATE_RX.match(raw.strip())
    if not m:
        raise ValueError(f"unparsed date: {raw!r}")
    date = f"20{m['yy']}-{MONTHS[m['mon']]:02d}-{int(m['day']):02d}"
    if m["aoe"]:
        tz = "AoE"
    elif m["tz"]:
        tz = m["tz"]
    else:
        tz = "America/Los_Angeles"  # column header on the page: "Date (America/Los_Angeles)"
    return {"date": date, "time": to_24h(m["time"]) if m["time"] else None, "timezone": tz, "raw": raw.strip()}


def key_dates() -> list[dict]:
    soup = soup_of(RAW / "dates.html")
    main = soup.find(id="main") or soup.body
    out: list[dict] = []
    tables = main.find_all("table")
    # Table 0: meeting dates
    for tr in tables[0].find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
        if len(cells) != 2:
            continue
        label, rng = cells
        m = re.match(r"(\w+) (\d+)(?: - (\d+))?", rng)
        mon = MONTHS[m.group(1)[:3]]
        out.append({
            "group": "Meeting Dates", "label": label,
            "date": f"{YEAR}-{mon:02d}-{int(m.group(2)):02d}",
            "endDate": f"{YEAR}-{mon:02d}-{int(m.group(3)):02d}" if m.group(3) else None,
            "time": None, "timezone": "America/Los_Angeles", "note": None, "passed": None, "raw": rng,
        })
    # Table 1: Important Dates and Deadlines
    for tr in tables[1].find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        label = tds[1].get_text(" ", strip=True)
        raw = tds[2].get_text(" ", strip=True)
        if not label or not raw:
            continue
        d = parse_date_cell(raw)
        out.append({"group": "Important Dates and Deadlines", "label": label, "date": d["date"],
                    "endDate": None, "time": d["time"], "timezone": d["timezone"], "note": None,
                    "passed": "strikeTableRow" in (tr.get("class") or []), "raw": d["raw"]})
    # Table 2: Dates and Deadlines (Exhibitors / Volunteers subgroups)
    group = None
    for tr in tables[2].find_all("tr"):
        tds = tr.find_all("td")
        texts = [td.get_text(" ", strip=True) for td in tds]
        if len(tds) == 1 and texts[0]:
            group = texts[0]
            continue
        if len(tds) < 3:
            continue
        label, raw = texts[1], texts[2]
        if not label or not raw:
            continue
        d = parse_date_cell(raw)
        out.append({"group": group, "label": label, "date": d["date"], "endDate": None,
                    "time": d["time"], "timezone": d["timezone"], "note": "Listed under 'Dates and Deadlines'",
                    "passed": "strikeTableRow" in (tr.get("class") or []), "raw": d["raw"]})
    return out


# ---------------------------------------------------------------------------
# 7. Assemble
# ---------------------------------------------------------------------------
def main() -> None:
    speakers = json.loads((DATA / "scripts" / "speakers.json").read_text(encoding="utf-8"))
    links = calendar_links()
    by_id, orals, posters = load_papers()
    ranges = poster_room_ranges()
    wdetail = workshops_detail()
    cards = schedule_cards()

    # Poster session label as shown on the official schedule ("Poster 1 (Tuesday Morning)")
    poster_labels: dict[int, str] = {}
    sched = soup_of(RAW / "site" / "site_Conferences_2026_Schedule.html")
    for a in sched.find_all("a", href=re.compile(r"showParentSession=(\d+)")):
        sid = int(re.search(r"showParentSession=(\d+)", a["href"]).group(1))
        t = a.get_text(" ", strip=True)
        if t.startswith("Poster ") and "(" in t:
            poster_labels[sid] = t

    sessions_by_date: dict[str, list[dict]] = defaultdict(list)
    weekday_by_date: dict[str, str] = {}
    title_counts = Counter(c["title"] for c in cards)

    for c in cards:
        weekday_by_date[c["date"]] = c["weekday"]
        cls, title = c["cls"], c["title"]
        s: dict = {
            "id": None,
            "start": c["start"], "end": c["end"],
            "type": None, "siteType": c["siteType"],
            "title": title, "room": c["room"],
            "speaker": None, "papers": None, "paperCount": None, "rooms": None,
            "colmUrl": None, "notes": None,
        }
        if cls == "eventsession":
            sid = c["num"]
            s["colmUrl"] = f"{BASE}/virtual/2026/session/{sid}"
            if title.startswith("Oral Session"):
                s["type"] = "oral"
                s["papers"] = [oral_paper_entry(r, by_id) for r in orals[sid]]
                s["paperCount"] = len(s["papers"])
                s["notes"] = "Four 15-minute talks. Each oral paper is also presented as a poster (see posterSession/posterPosition)."
            else:
                s["type"] = "poster"
                recs = posters[sid]
                s["paperCount"] = len(recs)
                s["room"] = None
                s["rooms"] = [r["room"] for r in ranges.get(sid, [])]
                s["roomAssignments"] = ranges.get(sid)
                s["roomCounts"] = dict(sorted(Counter(r["room_name"] for r in recs).items()))
                s["posterLabel"] = poster_labels.get(sid)
                s["notes"] = "Poster numbers map to rooms per roomAssignments. Paper list lives in the papers dataset (filter by session)."
        elif cls == "workshop":
            wid = c["num"]
            d = wdetail.get(wid, {})
            s["type"] = "workshop"
            s["colmUrl"] = f"{BASE}/virtual/2026/workshop/{wid}"
            s["organizers"] = d.get("organizers") or ([o.strip() for o in c["footer"].split("⋅") if o.strip()] if c["footer"] else [])
            s["projectUrl"] = d.get("projectUrl")
            s["abstract"] = d.get("abstract")
            s["room"] = None
            s["notes"] = "Room not published on colm.cc as of the fetch date."
        else:
            s["type"] = TYPE_MAP[cls]
            s["colmUrl"] = links.get(title)
            if cls == "invited-talk":
                name = c["footer"] or title.replace("Keynote:", "").strip()
                sp = speakers.get(name, {})
                s["speaker"] = {"name": name, "affiliation": sp.get("affiliation"),
                                "talkTitle": None, "abstract": None, "url": sp.get("url")}
                s["notes"] = "Talk title and abstract not published on colm.cc as of the fetch date."
            elif cls == "panel":
                names = [n.strip() for n in (c["footer"] or "").split(",") if n.strip()]
                s["panelists"] = [{"name": n, "affiliation": speakers.get(n, {}).get("affiliation"),
                                   "url": speakers.get(n, {}).get("url")} for n in names]
                s["notes"] = "Panel topic and moderator not published on colm.cc as of the fetch date."
            elif cls == "registration-desk":
                s["notes"] = "Registration desk hours."
            elif cls == "expo-talk-panel":
                s["notes"] = "Sponsor expo talk during the lunch break. Speakers/sponsors not listed on colm.cc."
            elif cls == "break" and title.startswith("Lunch"):
                s["notes"] = "Lunch is not provided by the conference."
        # id
        base = slugify(title)
        if title_counts[title] > 1:
            base = f"{base}-{c['weekday'][:3].lower()}-{c['start'].replace(':', '')}"
        s["id"] = base
        sessions_by_date[c["date"]].append(s)

    # Order within a day: by start time, stable w.r.t. site order; workshops alphabetical.
    days = []
    labels = {
        "2026-10-05": "Pre-conference · Early registration",
        "2026-10-06": "Main conference · Day 1",
        "2026-10-07": "Main conference · Day 2",
        "2026-10-08": "Main conference · Day 3",
        "2026-10-09": "Workshops",
    }
    for date in sorted(sessions_by_date):
        sess = sessions_by_date[date]
        ws = sorted([s for s in sess if s["type"] == "workshop"], key=lambda s: s["title"].lower())
        rest = [s for s in sess if s["type"] != "workshop"]
        # Same start minute: main-track events first, then socials/expo/registration, then breaks.
        prio = {"break": 2, "social": 1, "other": 1}
        rest.sort(key=lambda s: (s["start"], prio.get(s["type"], 0)))  # stable
        if ws:
            # insert workshops after the first item that starts at/before 08:30
            merged = [s for s in rest if s["start"] <= "08:30"] + ws + [s for s in rest if s["start"] > "08:30"]
        else:
            merged = rest
        days.append({"date": date, "weekday": weekday_by_date[date], "label": labels.get(date, ""), "sessions": merged})

    all_ids = [s["id"] for d in days for s in d["sessions"]]
    dupes = [k for k, v in Counter(all_ids).items() if v > 1]
    assert not dupes, f"duplicate ids: {dupes}"

    rooms_seen = sorted({r for d in days for s in d["sessions"] for r in ([s["room"]] if s["room"] else []) + (s["rooms"] or [])})

    out = {
        "conference": "COLM 2026 · The Third Annual Conference on Language Modeling",
        "timezone": "America/Los_Angeles",
        "fetchedAt": "2026-09-22",
        "sources": {
            "officialSchedule": f"{BASE}/Conferences/2026/Schedule",
            "virtualCalendar": f"{BASE}/virtual/2026/calendar",
            "papersJson": f"{BASE}/static/virtual/data/colm-2026-orals-posters.json",
            "sessionsListing": f"{BASE}/virtual/2026/events/session",
            "workshopsListing": f"{BASE}/virtual/2026/events/workshop",
            "keyDates": f"{BASE}/Conferences/2026/Dates",
            "home": f"{BASE}/",
        },
        "venue": {
            "name": "Hilton San Francisco Union Square",
            "shortName": "Hilton Union Square",
            "city": "San Francisco",
            "address": "333 O'Farrell Street, San Francisco, CA 94102, USA",
            "url": "https://www.hilton.com/en/hotels/sfofhhh-hilton-san-francisco-union-square/",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Hilton+Union+Square+San+Francisco",
            "hotelBookingUrl": "https://book.passkey.com/e/51150503",
            "rooms": rooms_seen,
        },
        "notes": [
            "Main conference (Oct 6-8) is single-track: keynotes, oral sessions and closing remarks are in the Grand Ballroom.",
            "Poster sizes announced on colm.cc: main conference 36\" x 72\"; workshops 34\" x 34\".",
            "Registration to the general public was listed as sold out (waitlist) on colm.cc as of the fetch date.",
            "Keynote and panelist affiliations are not published on colm.cc; they were added from the speakers' public profiles (see schedule-NOTES.md).",
            "Session types: keynote, oral, poster, panel, remarks, workshop, break, social, other (registration desk / sponsor expo talk).",
        ],
        "days": days,
        "keyDates": key_dates(),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # console summary
    for d in days:
        print(d["date"], d["weekday"], len(d["sessions"]), "sessions")
    print("keyDates:", len(out["keyDates"]))
    print("rooms:", rooms_seen)


if __name__ == "__main__":
    main()
