/* Accepted papers per workshop, from colm.cc's workshop pages.

   colm.cc renders each workshop's schedule — including the papers under each poster
   session — only for logged-in attendees, so this runs in the browser, not in curl:

     1. log in to colm.cc, open any https://colm.cc/virtual/2026/workshop/<id> page
     2. paste this file into the DevTools console
     3. it copies the JSON to the clipboard: save it as tmp/workshop-papers-raw.json, then
        uv run python scripts/fetch/build_workshop_papers.py tmp/workshop-papers-raw.json
        (maps colm.cc workshop ids to this site's ids → data-src/workshop-papers.json)

   A paper row prefixed with "→" belongs to the timed row above it (a poster session);
   rows without the arrow are a plain list with no session (session = null).
*/
(async () => {
  const IDS = [2549, 2550, 2551, 2552, 2553, 2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566];
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const out = {};
  for (const id of IDS) {
    const html = await fetch("/virtual/2026/workshop/" + id, { credentials: "include" }).then((r) => r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    const sessions = [], papers = [];
    let cur = null;
    for (const r of doc.querySelectorAll("tr.schedule-row")) {
      const time = clean(r.querySelector(".schedule-time")?.textContent);
      const name = clean(r.querySelector(".schedule-event-name")?.textContent);
      const authors = clean(r.querySelector(".schedule-authors")?.textContent);
      const idm = /(\d+)$/.exec(r.id || "");
      if (time) { cur = { time, title: name, speakers: authors || null }; sessions.push(cur); continue; }
      papers.push({
        colmId: idm ? +idm[1] : null,
        title: name.replace(/^→\s*/, ""),
        authors: authors ? authors.split(" ⋅ ").map(clean) : [],
        session: name.startsWith("→") && cur ? cur.time + " " + cur.title : null,
      });
    }
    out[id] = { id, sessions, papers };
    await new Promise((r) => setTimeout(r, 300));
  }
  copy(JSON.stringify(out, null, 2));          // DevTools console helper
  console.log(Object.values(out).map((w) => w.id + ": " + w.papers.length).join("\n"));
})();
