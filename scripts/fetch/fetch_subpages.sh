#!/bin/bash
# Fetch subpages (CFP / schedule / organizers) for sites that split content across pages
cd "$(dirname "$0")/../raw/workshops" || exit 1
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
fetch() { curl -sL -A "$UA" --max-time 30 -w "%{http_code} $1\n" "$2" -o "$1.html"; sleep 0.5; }
fetch genai4world-cfp "https://sites.google.com/view/genai4world/call-for-papers"
fetch genai4world-schedule "https://sites.google.com/view/genai4world/schedule"
fetch genai4world-accepted "https://sites.google.com/view/genai4world/accepted-submissions"
fetch lm4sci-2026 "https://lm4sci.github.io/docs/2026"
fetch lm4sci-2026-schedule "https://lm4sci.github.io/docs/2026/schedule"
fetch lm4sci-2026-cfp "https://lm4sci.github.io/docs/2026/call-for-papers"
fetch lm4sci-2026-organizers "https://lm4sci.github.io/docs/2026/organizers"
# second batch
fetch moss-cfp "https://sites.google.com/view/moss-colm-2026/call-for-papers"
fetch moss-speakers "https://sites.google.com/view/moss-colm-2026/speakers"
fetch moss-organizers "https://sites.google.com/view/moss-colm-2026/organizing-committee"
fetch tokenization-speakers "https://tokenization-workshop.github.io/speakers/"
fetch tokenization-schedule "https://tokenization-workshop.github.io/schedule/"
fetch social-sim-cfp "https://sites.google.com/view/social-sims-with-llms/call-for-papers"
