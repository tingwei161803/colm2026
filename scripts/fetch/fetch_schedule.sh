#!/usr/bin/env bash
# Re-download every source used by build_schedule.py into tmp/data/raw/schedule/.
# Usage: bash tmp/data/scripts/fetch_schedule.sh   (run from the repo root)
set -euo pipefail
UA="Mozilla/5.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)/raw/schedule"
mkdir -p "$ROOT/site" "$ROOT/detail" "$ROOT/colmweb"
cd "$ROOT"

get() { curl -sL -A "$UA" -o "$2" "$1"; echo "$1 -> $2 ($(wc -c < "$2") bytes)"; }

# Virtual site
get https://colm.cc/virtual/2026/calendar                calendar.html
get https://colm.cc/virtual/2026/index.html              index.html
get https://colm.cc/virtual/2026/events/session          ev_events_session.html
get https://colm.cc/virtual/2026/events/workshop         ev_events_workshop.html
get https://colm.cc/virtual/2026/events/panel            ev_events_panel.html
get https://colm.cc/virtual/2026/events/remarks          ev_events_remarks.html
get https://colm.cc/virtual/2026/events/oral             ev_events_oral.html
get https://colm.cc/virtual/2026/events/poster           ev_events_poster.html

# Bulk JSON (found by grepping the events pages for /static/virtual/data/*.json)
get https://colm.cc/static/virtual/data/colm-2026-orals-posters.json colm-2026-orals-posters.json
get https://colm.cc/static/virtual/data/colm-2026-abstracts.json     colm-2026-abstracts.json

# Main site
get https://colm.cc/                                     site/site_home.html
get https://colm.cc/Conferences/2026/Schedule            site/site_Conferences_2026_Schedule.html
get https://colm.cc/Conferences/2026/Workshops           site/site_Conferences_2026_Workshops.html
get https://colm.cc/Conferences/2026/Hotels              site/site_Conferences_2026_Hotels.html
get https://colm.cc/Conferences/2026/Dates               dates.html

# Detail pages linked from the calendar (remarks / invited-talk / panel / session / workshop)
grep -oE 'href="/virtual/2026/(remarks|invited-talk|session|panel|workshop)/[0-9]+"' calendar.html \
  | sort -u | sed -E 's/href="([^"]+)"/\1/' | while read -r p; do
    f="$(echo "$p" | sed 's#/virtual/2026/##; s#/#_#g')"
    get "https://colm.cc$p" "detail/$f.html"
  done
