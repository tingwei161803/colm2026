#!/usr/bin/env bash
# Re-download every raw source used to build papers.json.
# Run from tmp/data/ : bash scripts/fetch_sources.sh
set -euo pipefail
RAW="$(cd "$(dirname "$0")/.." && pwd)/raw"
mkdir -p "$RAW"
UA="Mozilla/5.0 (compatible; colm2026-unofficial-site/0.1)"
get() { curl -sS -L -A "$UA" -o "$RAW/$2" -w "%{http_code} %{size_download} $1\n" "$1"; sleep 1; }

get "https://colm.cc/static/virtual/data/colm-2026-orals-posters.json" colm-2026-orals-posters.json
get "https://colm.cc/static/virtual/data/colm-2026-abstracts.json"     colm-2026-abstracts.json
get "https://colm.cc/Conferences/2026/AcceptedPapers"                    accepted-papers.html
get "https://colm.cc/virtual/2026/papers.html"                           papers-listing.html
get "https://colm.cc/virtual/2026/calendar"                              calendar.html
get "https://colm.cc/virtual/2026/poster/2227"                           poster-2227.html
# OpenReview: group metadata works, but /notes and /profiles return 403 ChallengeRequiredError (Cloudflare Turnstile).
get "https://api2.openreview.net/groups?id=colmweb.org/COLM/2026/Conference" or-group.json
get "https://api2.openreview.net/notes?content.venueid=colmweb.org/COLM/2026/Conference&limit=3&offset=0" or-notes-probe.json
