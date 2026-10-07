/* =========================================================================
   COLM 2026 · taiwan.js — Taiwanese researchers and when to find them

   Data: window.TAIWAN_DATA = { people: [...], slots: [...] }
   person: { name, aka|null (another name they go by), affiliation|null, papers: [slot id] }
   slot:   { id, kind: poster|oral|workshop, title, titleZh, authors[],
             taiwanese[] (listed people among the authors), day, windows: [[start, end]], room,
             posterSession, posterNumber, workshop: {id, name}|null, links: {colm, openreview, pdf, arxiv}, inList }
           Workshop papers have two windows: the workshop's poster sessions (which one is not announced).
   URL: ?who=<name-slug> filters to one person (kept across the language switch).
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var D = window.TAIWAN_DATA || { people: [], slots: [] };

  var UI = {
    en: { people: "People", all: "Everyone", papers: "papers", paper: "paper", noPaper: "Paper details to be added",
          byDay: "By day", poster: "Poster", oral: "Oral", workshop: "Workshop", session: "Poster session",
          board: "Board", wsNote: "Workshop poster — presented in one of the workshop's two poster sessions (not announced which).",
          wsPage: "Workshop", details: "Paper details", openreview: "OpenReview", pdf: "PDF", arxiv: "arXiv",
          tz: "Times are Pacific (PDT). Main-conference times are the whole poster session (colm.cc); workshop times come from each workshop's website.",
          showing: "Showing papers by", clear: "Show everyone", today: "Today" },
    zh: { people: "名單", all: "全部", papers: "篇", paper: "篇", noPaper: "論文資訊待補",
          byDay: "依日期", poster: "海報", oral: "口頭報告", workshop: "工作坊", session: "海報場次",
          board: "看板", wsNote: "工作坊海報 —— 會在該工作坊兩個海報時段的其中一個展示（官方未標明哪一個）。",
          wsPage: "工作坊", details: "論文頁", openreview: "OpenReview", pdf: "PDF", arxiv: "arXiv",
          tz: "時間皆為太平洋時間（PDT）。主會議海報時間為整個海報場次（colm.cc）；工作坊時間取自各工作坊官網。",
          showing: "目前只顯示", clear: "顯示全部", today: "今天" }
  }[lang];

  function slug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  var who = new URLSearchParams(location.search).get("who");
  var person = null;
  D.people.forEach(function (p) { if (slug(p.name) === who) person = p; });
  if (!person) who = null;

  function setWho(next) {
    who = next; person = null;
    D.people.forEach(function (p) { if (slug(p.name) === who) person = p; });
    var u = new URLSearchParams(location.search);
    if (who) u.set("who", who); else u.delete("who");
    var qs = u.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    var la = $("langToggle"); if (la) la.href = la.href.split("?")[0].split("#")[0] + (qs ? "?" + qs : "") + location.hash;
    paint();
  }

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
    var list = D.slots.filter(function (s) { return !person || person.papers.indexOf(s.id) >= 0; });
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

  function paint() {
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
