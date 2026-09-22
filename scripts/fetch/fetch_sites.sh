#!/bin/bash
# Fetch all 18 workshop homepages + colm.cc virtual pages into raw/workshops/
cd "$(dirname "$0")/../raw/workshops" || exit 1
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
fetch() { # slug url
  curl -sL -A "$UA" --max-time 30 -w "%{http_code} %{url_effective}\n" "$2" -o "$1.html"; sleep 0.5
}
fetch colm-virtual-events-workshop "https://colm.cc/virtual/2026/events/workshop"
fetch colm-virtual-calendar "https://colm.cc/virtual/2026/calendar"
fetch colm-virtual-root "https://colm.cc/virtual/2026"
fetch colm-virtual-workshops "https://colm.cc/virtual/2026/workshops"
fetch haips "https://haips.com"
fetch actionable-interpretability "https://actionable-interpretability.github.io/"
fetch advml-frontiers "https://advml-frontier.github.io/"
fetch ai-measurement-science "https://aimslab.stanford.edu/workshop"
fetch efficient-reasoning "https://wdlctc.github.io/efficient-reasoning-2026/"
fetch context-beyond-window "https://context-beyond-window.github.io/"
fetch genai4world "https://sites.google.com/view/genai4world/"
fetch situated-embodied-interaction "https://learning-situated-interaction.github.io/"
fetch daih "https://daih2026.github.io/"
fetch lm4sci "https://lm4sci.github.io/"
fetch moss "https://sites.google.com/view/moss-colm-2026/"
fetch nonar-lm "https://pengzhangzhi.github.io/NonAR-LM/"
fetch tokenization "https://tokenization-workshop.github.io/"
fetch social-sim "https://sites.google.com/view/social-sims-with-llms"
fetch lifelong-agent "https://lifelongagent.github.io/"
fetch agent-behavior "https://www.aiagentbehavior.com"
fetch re-data "https://re-data-colm2026.github.io/"
fetch science-ai "https://science-ai-2026.github.io"
