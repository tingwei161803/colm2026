/* =========================================================================
   COLM 2026 · taiwan.js — Taiwanese researchers and when to find them

   Data: window.TAIWAN_DATA = { people: [...], slots: [...] }
   person: { name, aka|null (another name they go by), affiliation|null, papers: [slot id] }
   slot:   { id, kind: poster|oral|workshop, title, titleZh, authors[],
             taiwanese[] (listed people among the authors), day, windows: [[start, end]], room,
             posterSession, posterNumber, workshop: {id, name}|null, links: {colm, openreview, pdf, arxiv}, inList }
           Workshop papers have two windows: the workshop's poster sessions (which one is not announced).
   URL: ?who=<name-slug> filters to one person (kept across the language switch);
        ?t=2026-10-07T16:30 pins the "who's where" scrubber (absent = live, follows the clock).
   Floor plans come from venue-map.js (window.VENUE_MAP).
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var D = window.TAIWAN_DATA || { people: [], slots: [] };
  var VM = window.VENUE_MAP;

  var UI = {
    en: { people: "People", all: "Everyone", papers: "papers", paper: "paper", noPaper: "Paper details to be added",
          byDay: "By day", poster: "Poster", oral: "Oral", workshop: "Workshop", session: "Poster session",
          board: "Board", wsNote: "Workshop poster — presented in one of the workshop's two poster sessions (not announced which).",
          wsPage: "Workshop", details: "Paper details", openreview: "OpenReview", pdf: "PDF", arxiv: "arXiv",
          tz: "Times are Pacific (PDT). Main-conference times are the whole poster session (colm.cc); workshop times come from each workshop's website.",
          showing: "Showing papers by", clear: "Show everyone", today: "Today",
          now: "Now", live: "Live", time: "Time", taiwan: "Taiwan", until: "until", left: "min left",
          hereN: function (n) { return n + (n > 1 ? " Taiwanese presenters" : " Taiwanese presenter") + " at this time"; },
          nobody: "No Taiwanese poster at this time.", next: "Next up", jump: "Go to", noMore: "No more Taiwanese posters after this.",
          before: "The conference has not started yet — showing the first day.", after: "The conference is over — showing the last day.",
          sessions: "Sessions this day", people: "people", maybe: "one of two sessions",
          allLevels: "Show all floors", fewLevels: "Only floors with someone",
          mapNote: "Simplified floor plans redrawn from the venue poster, not to scale. Franciscan rooms are shown by board number: colm.cc and the venue poster letter them differently." },
    zh: { people: "名單", all: "全部", papers: "篇", paper: "篇", noPaper: "論文資訊待補",
          byDay: "依日期", poster: "海報", oral: "口頭報告", workshop: "工作坊", session: "海報場次",
          board: "看板", wsNote: "工作坊海報 —— 會在該工作坊兩個海報時段的其中一個展示（官方未標明哪一個）。",
          wsPage: "工作坊", details: "論文頁", openreview: "OpenReview", pdf: "PDF", arxiv: "arXiv",
          tz: "時間皆為太平洋時間（PDT）。主會議海報時間為整個海報場次（colm.cc）；工作坊時間取自各工作坊官網。",
          showing: "目前只顯示", clear: "顯示全部", today: "今天",
          now: "現在", live: "即時", time: "時間", taiwan: "台灣", until: "到", left: "分鐘後結束",
          hereN: function (n) { return "此刻有 " + n + " 位台灣人在海報前"; },
          nobody: "這個時間沒有台灣人的海報。", next: "下一場", jump: "跳到", noMore: "之後沒有台灣人的海報了。",
          before: "會議還沒開始，先顯示第一天。", after: "會議已經結束，顯示最後一天。",
          sessions: "這天的場次", people: "人", maybe: "兩個時段之一",
          allLevels: "顯示所有樓層", fewLevels: "只看有人的樓層",
          mapNote: "依現場樓層圖重繪的示意圖，未依比例。Franciscan 各廳以看板編號標示：colm.cc 與現場樓層圖的字母順序不同。" }
  }[lang];

  function slug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  var who = new URLSearchParams(location.search).get("who");
  var person = null;
  D.people.forEach(function (p) { if (slug(p.name) === who) person = p; });
  if (!person) who = null;

  function syncUrl() {
    var u = new URLSearchParams(location.search);
    if (who) u.set("who", who); else u.delete("who");
    if (at.live) u.delete("t"); else u.set("t", at.day + "T" + hhmm(at.min));
    var qs = u.toString().replace(/%3A/g, ":");
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    var la = $("langToggle"); if (la) la.href = la.href.split("?")[0].split("#")[0] + (qs ? "?" + qs : "") + location.hash;
  }
  function setWho(next) {
    who = next; person = null;
    D.people.forEach(function (p) { if (slug(p.name) === who) person = p; });
    syncUrl();
    paint();
  }
  function visibleSlots() { return D.slots.filter(function (s) { return !person || person.papers.indexOf(s.id) >= 0; }); }

  /* ---------- people strip ---------- */
  function daysOf(p) {
    var seen = {};
    D.slots.forEach(function (s) { if (p.papers.indexOf(s.id) >= 0) seen[s.day] = 1; });
    return Object.keys(seen).sort();
  }
  function peopleHtml() {
    return '<div class="twp">' + D.people.map(function (p) {
      var n = p.papers.length, on = who === slug(p.name);
      var days = daysOf(p).map(function (d) { return '<span class="badge">' + esc(SH.fmtDay(d)) + '</span>'; }).join("");
      return '<button type="button" class="twp__card" data-who="' + esc(slug(p.name)) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="twp__name">' + esc(p.name) + (p.aka ? ' <small class="twp__aka">(' + esc(p.aka) + ')</small>' : "") + '</span>' +
        (p.affiliation ? '<span class="twp__affil">' + esc(p.affiliation) + '</span>' : "") +
        '<span class="twp__meta">' + (n ? '<b>' + n + '</b> ' + (n > 1 ? UI.papers : UI.paper) + days : '<i>' + UI.noPaper + '</i>') + '</span>' +
      '</button>';
    }).join("") + '</div>';
  }

  /* ---------- timeline ---------- */
  function authorsHtml(s) {
    return s.authors.map(function (a) {
      return s.taiwanese.indexOf(a) >= 0 ? '<b class="tw-hl">' + esc(a) + '</b>' : esc(a);
    }).join(", ");
  }
  function linkBtn(label, url, icon, primary, external) {
    if (!url) return "";
    return '<a class="linkbtn' + (primary ? " linkbtn--primary" : "") + '" href="' + esc(url) + '"' +
      (external ? ' target="_blank" rel="noopener"' : "") + '>' +
      '<span class="material-symbols-rounded" aria-hidden="true">' + icon + '</span>' + esc(label) + '</a>';
  }
  function slotHtml(s) {
    var title = lang === "zh" && s.titleZh ? s.titleZh : s.title;
    var sub = lang === "zh" && s.titleZh ? '<p class="prog__sub tw-en">' + esc(s.title) + '</p>' : "";
    var where = [s.room, s.posterNumber != null ? UI.board + " #" + s.posterNumber : null].filter(Boolean).join(" · ");
    var ws = s.workshop ? SH.langRoot + "workshops/#" + encodeURIComponent(s.workshop.id) : null;
    var badge = s.kind === "poster" ? UI.session + " " + s.posterSession : UI[s.kind];
    var L = s.links || {};
    var inner = s.inList ? SH.langRoot + "papers/?p=" + encodeURIComponent(s.id) : null;
    return '<li class="prog" style="--cat:' + SH.cat(s.kind === "workshop" ? "workshop" : (s.room || s.kind)) + '">' +
      '<div class="prog__time">' + s.windows.map(function (w) {
        return w[0] ? '<b>' + esc(SH.fmtTime(w[0])) + '</b>' + (w[1] ? esc(SH.fmtTime(w[1])) : "") : '<b>' + UI.workshop + '</b>';
      }).join('<span class="tw-or">/</span>') + '</div>' +
      '<div class="prog__body"><div class="prog__top">' +
        '<span class="badge badge--cat" style="--cat:' + SH.cat(s.kind) + '">' + esc(badge) + '</span>' +
        (where ? '<span class="prog__room"><span class="material-symbols-rounded" aria-hidden="true">location_on</span>' + esc(where) + '</span>' : "") +
      '</div>' +
      '<h3 class="prog__title">' + (inner ? '<a href="' + esc(inner) + '">' + esc(title) + '</a>' : esc(title)) + '</h3>' + sub +
      '<p class="prog__sub">' + authorsHtml(s) + '</p>' +
      (s.workshop ? '<p class="prog__sub"><span class="material-symbols-rounded tw-ic" aria-hidden="true">groups</span><a href="' + esc(ws) + '">' + esc(s.workshop.name) + '</a></p>' : "") +
      (s.kind === "workshop" ? '<p class="prog__sub">' + UI.wsNote + '</p>' : "") +
      '<div class="prog__actions">' +
        linkBtn(UI.details, inner, "article", true, false) +
        linkBtn(UI.openreview, L.openreview, "forum", false, true) +
        linkBtn(UI.arxiv, L.arxiv, "description", !inner, true) +
        linkBtn(UI.pdf, L.pdf, "picture_as_pdf", false, true) +
      '</div></div></li>';
  }
  function timelineHtml() {
    var list = visibleSlots();
    var days = [];
    list.forEach(function (s) {
      var g = days.length && days[days.length - 1].day === s.day ? days[days.length - 1] : null;
      if (!g) { g = { day: s.day, items: [] }; days.push(g); }
      g.items.push(s);
    });
    var todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    var head = person ? '<p class="tw-filter">' + UI.showing + ' <b>' + esc(person.name) + '</b> · ' +
      '<button type="button" class="linkish" data-who="">' + UI.clear + '</button></p>' : "";
    if (person && !list.length) return head + '<p class="note">' + UI.noPaper + '</p>';
    return head + days.map(function (g) {
      return '<div class="day-head"><h2>' + esc(SH.fmtDay(g.day, true)) + '</h2><span>' + g.items.length + ' ' + UI.papers +
        (g.day === todayIso ? ' · <b class="tw-today">' + UI.today + '</b>' : "") + '</span></div>' +
        '<ol class="program">' + g.items.map(slotHtml).join("") + '</ol>';
    }).join("") + '<p class="note" style="margin-top:12px">' + UI.tz + '</p>';
  }

  /* ---------- who's where: time scrubber + floor plan ----------
     All times are conference-local (PDT). "Live" follows the clock and is the default; touching
     the scrubber pins a time (kept in ?t=). */
  var MIN0 = 7 * 60, MIN1 = 20 * 60, STEP = 5;
  var DAYS = (function () { var o = {}; D.slots.forEach(function (s) { o[s.day] = 1; }); return Object.keys(o).sort(); })();
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toMin(v) { var p = String(v).split(":"); return +p[0] * 60 + +p[1]; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function partsIn(tz, date) {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { day: o.year + "-" + o.month + "-" + o.day, min: (+o.hour % 24) * 60 + +o.minute };
  }
  function firstStart(day) {
    var m = null;
    D.slots.forEach(function (s) { if (s.day === day) s.windows.forEach(function (w) { if (w[0] && (m == null || toMin(w[0]) < m)) m = toMin(w[0]); }); });
    return m == null ? 9 * 60 : m;
  }
  var at = { day: DAYS[0], min: MIN0, live: true, note: null }, allLevels = false;
  function goLive() {
    var n = partsIn("America/Los_Angeles", new Date()), last = DAYS[DAYS.length - 1];
    if (DAYS.indexOf(n.day) >= 0) at = { day: n.day, min: n.min, live: true, note: null };
    else if (n.day < DAYS[0]) at = { day: DAYS[0], min: firstStart(DAYS[0]), live: false, note: "before" };
    else at = { day: last, min: firstStart(last), live: false, note: "after" };
  }
  (function initAt() {
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("t") || "");
    if (m && DAYS.indexOf(m[1]) >= 0) at = { day: m[1], min: +m[2] * 60 + +m[3], live: false, note: null };
    else goLive();
  })();

  function windowEnd(w) { return w[1] ? toMin(w[1]) : toMin(w[0]) + 30; }
  function presentAt(slots, day, min) {
    var out = [];
    slots.forEach(function (s) {
      if (s.day !== day) return;
      s.windows.forEach(function (w) { if (w[0] && toMin(w[0]) <= min && min < windowEnd(w)) out.push({ slot: s, win: w }); });
    });
    return out;
  }
  function nextAfter(slots, day, min) {
    var best = null, key = day + " " + hhmm(min);
    slots.forEach(function (s) {
      s.windows.forEach(function (w) {
        if (!w[0]) return;
        var k = s.day + " " + w[0];
        if (k > key && (!best || k < best)) best = k;
      });
    });
    if (!best) return null;
    var p = best.split(" ");
    return { day: p[0], min: toMin(p[1]), items: presentAt(slots, p[0], toMin(p[1])) };
  }
  // one group per set of zones (a room, or a board range inside a room); numbered for map ↔ list
  function groupsOf(items) {
    var groups = [], byKey = {};
    items.slice().sort(function (a, b) { return (a.slot.posterNumber || 0) - (b.slot.posterNumber || 0); }).forEach(function (it) {
      var zones = VM ? VM.zoneFor(it.slot.room, it.slot.posterNumber) : [];
      var key = zones.join("+") || "?" + it.slot.room;
      if (!byKey[key]) { byKey[key] = { zones: zones, room: it.slot.room, items: [] }; groups.push(byKey[key]); }
      byKey[key].items.push(it);
    });
    groups.forEach(function (g, i) { g.mark = String(i + 1); });
    return groups;
  }

  function ctlHtml(slots) {
    var segs = {}, chips = [];
    slots.forEach(function (s) {
      if (s.day !== at.day) return;
      s.windows.forEach(function (w) {
        if (!w[0]) return;
        var k = w[0] + "-" + (w[1] || "");
        if (!segs[k]) { segs[k] = { a: toMin(w[0]), b: windowEnd(w), names: {} }; chips.push(segs[k]); }
        s.taiwanese.forEach(function (n) { segs[k].names[n] = 1; });
      });
    });
    chips.sort(function (x, y) { return x.a - y.a; });
    var span = MIN1 - MIN0;
    function pct(m) { return Math.max(0, Math.min(100, (m - MIN0) / span * 100)); }
    var ticks = [];
    for (var h = MIN0 + 60; h < MIN1; h += 120) ticks.push('<span style="left:' + pct(h) + '%">' + esc(SH.fmtTime(hhmm(h)).replace(":00", "")) + '</span>');
    return '<div class="now__top">' +
        '<div class="now__days" role="group" aria-label="' + esc(UI.time) + '">' + DAYS.map(function (d) {
          return '<button type="button" class="chip" data-day="' + d + '" aria-pressed="' + (d === at.day ? "true" : "false") + '">' + esc(SH.fmtDay(d)) + '</button>';
        }).join("") + '</div>' +
        '<button type="button" class="linkbtn now__livebtn" id="nowLive" aria-pressed="' + (at.live ? "true" : "false") + '">' +
          '<span class="now__dot" aria-hidden="true"></span>' + (at.live ? UI.live : UI.now) + '</button>' +
      '</div>' +
      '<div class="now__clock"><b id="nowTime"></b><span id="nowDay"></span><small id="nowTw"></small></div>' +
      '<div class="now__scrub">' +
        '<div class="now__track" aria-hidden="true">' + chips.map(function (c) {
          return '<span class="now__seg" style="left:' + pct(c.a) + '%;width:' + (pct(c.b) - pct(c.a)) + '%"></span>';
        }).join("") + '</div>' +
        '<input type="range" id="nowRange" min="' + MIN0 + '" max="' + MIN1 + '" step="' + STEP + '" aria-label="' + esc(UI.time) + '">' +
        '<div class="now__ticks" aria-hidden="true">' + ticks.join("") + '</div>' +
      '</div>' +
      (chips.length ? '<div class="now__chips"><span class="filter-label">' + UI.sessions + '</span>' + chips.map(function (c) {
        var n = Object.keys(c.names).length;
        return '<button type="button" class="chip" data-jump="' + at.day + ' ' + c.a + '">' + esc(SH.fmtTime(hhmm(c.a))) + '–' + esc(SH.fmtTime(hhmm(c.b))) +
          ' <span class="count">' + n + ' ' + UI.people + '</span></button>';
      }).join("") + '</div>' : "");
  }

  function itemHtml(it, live) {
    var s = it.slot, title = lang === "zh" && s.titleZh ? s.titleZh : s.title;
    var href = s.inList ? SH.langRoot + "papers/?p=" + encodeURIComponent(s.id) : (s.links.openreview || s.links.arxiv || null);
    var names = s.taiwanese.filter(function (n) { return !person || n === person.name; });
    var end = windowEnd(it.win), when = esc(SH.fmtTime(it.win[0])) + "–" + esc(SH.fmtTime(hhmm(end)));
    if (live && at.min >= toMin(it.win[0])) when += ' · ' + (end - at.min) + " " + UI.left;
    return '<li><p class="nowl__who">' + names.map(function (n) { return '<b>' + esc(n) + '</b>'; }).join(", ") +
      (s.posterNumber != null ? ' <span class="badge">' + UI.board + ' #' + s.posterNumber + '</span>' : "") + '</p>' +
      '<p class="nowl__title">' + (href ? '<a href="' + esc(href) + '"' + (s.inList ? "" : ' target="_blank" rel="noopener"') + '>' + esc(title) + '</a>' : esc(title)) + '</p>' +
      '<p class="nowl__when">' + when + (s.windows.length > 1 ? ' · ' + UI.maybe : "") + '</p></li>';
  }
  function listHtml(groups, live) {
    return '<ol class="nowl">' + groups.map(function (g) {
      return '<li class="nowl__g"><span class="nowl__mk" aria-hidden="true">' + g.mark + '</span><div>' +
        '<p class="nowl__room"><span class="material-symbols-rounded" aria-hidden="true">location_on</span>' + esc(g.room || "") + '</p>' +
        '<ul>' + g.items.map(function (it) { return itemHtml(it, live); }).join("") + '</ul></div></li>';
    }).join("") + '</ol>';
  }

  function paintAt() {
    var slots = visibleSlots(), here = presentAt(slots, at.day, at.min);
    var next = here.length ? null : nextAfter(slots, at.day, at.min);
    var groups = groupsOf(here.length ? here : (next ? next.items : []));
    var active = {};
    groups.forEach(function (g) { g.zones.forEach(function (z) { active[z] = { mark: g.mark, state: here.length ? "on" : "next" }; }); });

    var r = $("nowRange"); if (r && document.activeElement !== r) r.value = Math.max(MIN0, Math.min(MIN1, at.min));
    $("nowTime").textContent = SH.fmtTime(hhmm(at.min)) + " PDT";
    $("nowDay").textContent = SH.fmtDay(at.day, true);
    var tw = partsIn("Asia/Taipei", new Date(at.day + "T" + hhmm(at.min) + ":00-07:00"));   // PDT is UTC−7 for Oct 6–9
    $("nowTw").textContent = UI.taiwan + " " + SH.fmtDay(tw.day) + " " + hhmm(tw.min);

    var status = at.note ? '<p class="note">' + UI[at.note] + '</p>' : "";
    var list;
    if (here.length) {
      var n = {}; here.forEach(function (it) { it.slot.taiwanese.forEach(function (x) { if (!person || x === person.name) n[x] = 1; }); });
      list = status + '<p class="now__status"><span class="now__dot now__dot--on" aria-hidden="true"></span>' + esc(UI.hereN(Object.keys(n).length)) + '</p>' + listHtml(groups, at.live);
    } else if (next) {
      list = status + '<p class="now__status">' + UI.nobody + '</p>' +
        '<p class="now__next">' + UI.next + (lang === "zh" ? "：" : ": ") + '<b>' + esc(SH.fmtDay(next.day)) + ' ' + esc(SH.fmtTime(hhmm(next.min))) + '</b> ' +
        '<button type="button" class="linkish" data-jump="' + next.day + ' ' + next.min + '">' + UI.jump + ' ' + esc(SH.fmtTime(hhmm(next.min))) + ' →</button></p>' +
        listHtml(groups, false);
    } else {
      list = status + '<p class="now__status">' + UI.nobody + ' ' + UI.noMore + '</p>';
    }
    $("nowList").innerHTML = list;
    var map = VM ? VM.render(active, { lang: lang, showAll: allLevels }) : "";
    $("venue").innerHTML = (map || "") +
      '<div class="vm__foot"><button type="button" class="linkish" id="nowLevels">' + (allLevels ? UI.fewLevels : UI.allLevels) + '</button>' +
      '<p class="note">' + UI.mapNote + '</p></div>';
    $("nowLevels").addEventListener("click", function () { allLevels = !allLevels; paintAt(); });
    wireJumps($("nowList"));
  }
  function jumpTo(day, min) { at = { day: day, min: min, live: false, note: null }; syncUrl(); paintNow(); }
  function wireJumps(root) {
    [].forEach.call(root.querySelectorAll("[data-jump]"), function (b) {
      b.addEventListener("click", function () { var p = b.getAttribute("data-jump").split(" "); jumpTo(p[0], +p[1]); });
    });
  }
  function paintNow() {
    $("nowCtl").innerHTML = ctlHtml(visibleSlots());
    [].forEach.call($("nowCtl").querySelectorAll("[data-day]"), function (b) {
      b.addEventListener("click", function () { jumpTo(b.getAttribute("data-day"), at.min); });
    });
    wireJumps($("nowCtl"));
    $("nowLive").addEventListener("click", function () { goLive(); syncUrl(); paintNow(); });
    $("nowRange").addEventListener("input", function (e) {
      at = { day: at.day, min: +e.target.value, live: false, note: null };
      $("nowLive").setAttribute("aria-pressed", "false");
      $("nowLive").lastChild.textContent = UI.now;
      syncUrl(); paintAt();
    });
    paintAt();
  }
  setInterval(function () {
    if (!at.live) return;
    var d0 = at.day; goLive();
    if (at.day !== d0 || !at.live) paintNow(); else paintAt();
  }, 30000);

  function paint() {
    paintNow();
    $("people").innerHTML = peopleHtml();
    $("timeline").innerHTML = timelineHtml();
    [].forEach.call(document.querySelectorAll("[data-who]"), function (b) {
      b.addEventListener("click", function () {
        var w = b.getAttribute("data-who");
        setWho(w && w !== who ? w : null);
      });
    });
  }

  paint();
})();
