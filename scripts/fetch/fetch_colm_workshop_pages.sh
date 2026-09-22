#!/bin/bash
# Fetch per-workshop pages on colm.cc virtual site (ids from events/workshop listing)
cd "$(dirname "$0")/../raw/workshops" || exit 1
mkdir -p colm-virtual
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
for id in 2549 2550 2551 2552 2553 2554 2555 2556 2557 2558 2559 2560 2561 2562 2563 2564 2565 2566; do
  curl -sL -A "$UA" --max-time 30 -w "%{http_code} $id\n" "https://colm.cc/virtual/2026/workshop/$id" -o "colm-virtual/workshop-$id.html"
  sleep 0.4
done
# situated-interaction is a Vite SPA; grab its JS bundle
curl -sL -A "$UA" --max-time 30 -w "%{http_code} situated js\n" "https://learning-situated-interaction.github.io/assets/index-DwnQ1tDR.js" -o situated-embodied-interaction.bundle.js
