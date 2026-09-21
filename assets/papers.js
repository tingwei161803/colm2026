/* =========================================================================
   COLM 2026 · papers.js — Accepted Papers

   Layout: a compact, collapsible filter bar on top; below it the list (left)
   and the sticky detail panel (right). <900px → detail opens in the dialog.

   Data: window.PAPERS_DATA = {
     meta, topics: [ { id, en, zh } ],           // the 17 CFP topic areas, in CFP order
     papers: [ { id, title, titleZh, authors[], affiliations[]|null, topic|null,
                 oral, oralSession, oralTime, oralRoom, posterSession, day, time,
                 room, posterNumber, links: { colm, openreview, pdf, project } } ] }
   window.PAPERS_ABSTRACTS = { id: abstract }   // loaded lazily (data/papers-abstracts.<lang>.js)

   URL state (shareable): ?q=…&day=2026-10-06&room=imperial-ballroom&topic=<id>&oral=1&s=3&p=<id>
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var DATA = window.PAPERS_DATA || { papers: [], topics: [] };
  var ALL = DATA.papers.slice();
  var TOPIC_LIST = DATA.topics || [];

  var UI = {
    en: { search: "Search title or author", day: "Day", room: "Room", topic: "Topic", session: "Session", type: "Type",
          oral: "Oral only", clear: "Clear", filters: "Filters", papers: "papers", of: "of", empty: "No papers match these filters.",
          pick: "Select a paper to see its abstract, authors and where to find it.", abstract: "Abstract",
          where: "Where & when", posterSession: "Poster session", board: "Board", room2: "Room",
          time: "Time", topic2: "Topic", presentation: "Presentation", oralIn: "Oral + poster", posterOnly: "Poster",
          colm: "colm.cc page", openreview: "OpenReview", pdf: "PDF", project: "Project page", prev: "Previous", next: "Next",
          any: "All topics", noAbstract: "Abstract not available.", loading: "Loading abstract…", oralSlot: "Oral talk",
          topicNote: "Topic labels are unofficial (assigned from OpenReview keywords to the 17 call-for-papers areas)." },
    zh: { search: "搜尋標題或作者", day: "日期", room: "地點", topic: "主題", session: "場次", type: "類型",
          oral: "只看 Oral", clear: "清除", filters: "篩選", papers: "篇", of: "/", empty: "沒有符合條件的論文。",
          pick: "點選左側任一篇論文，這裡會顯示摘要、作者與海報位置。", abstract: "摘要",
          where: "時間與地點", posterSession: "海報場次", board: "海報編號", room2: "房間",
          time: "時間", topic2: "主題", presentation: "發表形式", oralIn: "口頭報告 + 海報", posterOnly: "海報",
          colm: "colm.cc 頁面", openreview: "OpenReview", pdf: "PDF", project: "專案頁面", prev: "上一篇", next: "下一篇",
          any: "所有主題", noAbstract: "尚無摘要。", loading: "摘要載入中…", oralSlot: "口頭報告時段",
          topicNote: "主題標籤為非官方（依 OpenReview 關鍵字歸入 17 個徵稿主題）。" }
  }[lang];

  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function uniq(arr) { var seen = {}, out = []; arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } }); return out; }
  function topicOf(id) { for (var i = 0; i < TOPIC_LIST.length; i++) if (TOPIC_LIST[i].id === id) return TOPIC_LIST[i]; return null; }
  function topicLabel(id) { var tp = topicOf(id); return tp ? t(tp) : (id || ""); }
  function title(p) { return (lang === "zh" && p.titleZh) ? p.titleZh : p.title; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- facets ---------- */
  var DAYS = uniq(ALL.map(function (p) { return p.day; })).sort();
  var ROOMS = uniq(ALL.map(function (p) { return p.room; })).sort();
  var SESSIONS = uniq(ALL.map(function (p) { return p.posterSession; })).sort(function (a, b) { return a - b; });
  var sessionInfo = {};
  ALL.forEach(function (p) { if (p.posterSession && !sessionInfo[p.posterSession]) sessionInfo[p.posterSession] = { day: p.day, time: p.time }; });
  var HAS_TOPICS = TOPIC_LIST.length > 0 && ALL.some(function (p) { return p.topic; });

  /* ---------- state <-> URL ---------- */
  var state = { q: "", day: [], room: [], topic: "", session: [], oral: false, p: null };
  function readUrl() {
    var u = new URLSearchParams(location.search);
    state.q = u.get("q") || "";
    state.day = (u.get("day") || "").split(",").filter(Boolean);
    state.room = (u.get("room") || "").split(",").filter(Boolean);
    state.topic = u.get("topic") || "";
    state.session = (u.get("s") || "").split(",").filter(Boolean).map(Number);
    state.oral = u.get("oral") === "1";
    state.p = u.get("p") || (location.hash ? location.hash.slice(1) : null);
  }
  function writeUrl() {
    var u = new URLSearchParams();
    if (state.q) u.set("q", state.q);
    if (state.day.length) u.set("day", state.day.join(","));
    if (state.room.length) u.set("room", state.room.join(","));
    if (state.topic) u.set("topic", state.topic);
    if (state.session.length) u.set("s", state.session.join(","));
    if (state.oral) u.set("oral", "1");
    if (state.p) u.set("p", state.p);
    var qs = u.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    var la = $("langToggle"); if (la) la.href = la.href.split("?")[0].split("#")[0] + (qs ? "?" + qs : "");
  }
  function activeCount() {
    return state.day.length + state.room.length + state.session.length + (state.topic ? 1 : 0) + (state.oral ? 1 : 0);
  }

  /* ---------- filtering ---------- */
  function matches(p) {
    if (state.oral && !p.oral) return false;
    if (state.day.length && state.day.indexOf(p.day) < 0) return false;
    if (state.room.length && state.room.indexOf(slug(p.room)) < 0) return false;
    if (state.topic && p.topic !== state.topic) return false;
    if (state.session.length && state.session.indexOf(p.posterSession) < 0) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = (p.title + " " + (p.titleZh || "") + " " + (p.authors || []).join(" ")).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  var current = [];

  /* ---------- filter bar ---------- */
  var open = lsGet("papersFilters");
  if (open == null) open = SH.isNarrow() ? "false" : "true";

  function chip(label, pressed, attrs, catName, count) {
    return '<button type="button" class="chip' + (catName ? " chip--cat" : "") + '" aria-pressed="' + (pressed ? "true" : "false") + '" ' + attrs +
      (catName ? ' style="--cat:' + SH.cat(catName) + '"' : "") + '>' +
      (catName ? '<span class="chip__dot" aria-hidden="true"></span>' : "") + esc(label) +
      (count != null ? ' <span class="count">' + count + '</span>' : "") + '</button>';
  }
  function countBy(fn) { var m = {}; ALL.forEach(function (p) { var k = fn(p); if (k != null) m[k] = (m[k] || 0) + 1; }); return m; }

  function paintFilters() {
    var cDay = countBy(function (p) { return p.day; }), cRoom = countBy(function (p) { return slug(p.room); }),
        cSess = countBy(function (p) { return p.posterSession; }), cTopic = countBy(function (p) { return p.topic; }),
        oralN = ALL.filter(function (p) { return p.oral; }).length;
    var n = activeCount();
    var h = '<div class="pfilters__bar">' +
      '<div class="search"><span class="material-symbols-rounded" aria-hidden="true">search</span>' +
        '<input type="search" id="q" placeholder="' + esc(UI.search) + '" value="' + esc(state.q) + '" aria-label="' + esc(UI.search) + '"></div>' +
      '<button type="button" class="pfilters__toggle" id="filtersToggle" aria-expanded="' + open + '" aria-controls="filtersBody">' +
        '<span class="material-symbols-rounded" aria-hidden="true">expand_more</span>' + UI.filters + (n ? ' <span class="count">' + n + '</span>' : "") + '</button>' +
      '<span class="pfilters__meta"><b id="countN">0</b> ' + UI.of + ' ' + ALL.length + ' ' + UI.papers + '</span>' +
      (n || state.q ? '<button type="button" class="linkish" id="clearBtn">' + UI.clear + '</button>' : "") +
    '</div>';

    h += '<div class="pfilters__body" id="filtersBody">';
    h += '<div class="filter-group"><span class="filter-label">' + UI.day + '</span>' +
      DAYS.map(function (d) { return chip(SH.fmtDay(d), state.day.indexOf(d) >= 0, 'data-f="day" data-v="' + d + '"', null, cDay[d]); }).join("") + '</div>';
    if (SESSIONS.length) {
      h += '<div class="filter-group"><span class="filter-label">' + UI.session + '</span>' +
        SESSIONS.map(function (s) {
          var info = sessionInfo[s] || {};
          var lbl = (lang === "zh" ? "海報 " + s : "Poster " + s) + (info.time ? " · " + SH.fmtTime(info.time) : "");
          return chip(lbl, state.session.indexOf(s) >= 0, 'data-f="session" data-v="' + s + '"', null, cSess[s]);
        }).join("") + '</div>';
    }
    h += '<div class="filter-group"><span class="filter-label">' + UI.room + '</span>' +
      ROOMS.map(function (r) { return chip(r, state.room.indexOf(slug(r)) >= 0, 'data-f="room" data-v="' + slug(r) + '"', r, cRoom[slug(r)]); }).join("") + '</div>';
    h += '<div class="filter-group"><span class="filter-label">' + UI.type + '</span>' + chip(UI.oral, state.oral, 'data-f="oral"', null, oralN) + '</div>';
    if (HAS_TOPICS) {
      h += '<div class="filter-group"><span class="filter-label">' + UI.topic + '</span>' +
        '<select class="select" id="topicSel" aria-label="' + UI.topic + '" title="' + esc(UI.topicNote) + '"><option value="">' + esc(UI.any) + '</option>' +
        TOPIC_LIST.map(function (tp) {
          return '<option value="' + esc(tp.id) + '"' + (state.topic === tp.id ? " selected" : "") + '>' + esc(t(tp)) + (cTopic[tp.id] ? " (" + cTopic[tp.id] + ")" : "") + '</option>';
        }).join("") + '</select></div>';
    }
    h += '</div>';
    var root = $("filters");
    root.innerHTML = h;
    root.setAttribute("data-open", open);

    $("q").addEventListener("input", function (e) { state.q = e.target.value.trim(); update(false); });
    $("filtersToggle").addEventListener("click", function () {
      open = open === "true" ? "false" : "true"; lsSet("papersFilters", open);
      root.setAttribute("data-open", open); $("filtersToggle").setAttribute("aria-expanded", open);
    });
    if ($("clearBtn")) $("clearBtn").addEventListener("click", function () {
      state = { q: "", day: [], room: [], topic: "", session: [], oral: false, p: state.p };
      update(true);
    });
    if ($("topicSel")) $("topicSel").addEventListener("change", function (e) { state.topic = e.target.value; update(true); });
    [].forEach.call(root.querySelectorAll(".chip"), function (b) {
      b.addEventListener("click", function () {
        var f = b.dataset.f, v = b.dataset.v;
        if (f === "oral") { state.oral = !state.oral; }
        else { var arr = state[f], val = f === "session" ? Number(v) : v, i = arr.indexOf(val); if (i >= 0) arr.splice(i, 1); else arr.push(val); }
        update(true);
      });
    });
  }

  /* ---------- list ---------- */
  function paintList() {
    var ul = $("list");
    $("countN").textContent = current.length;
    if (!current.length) { ul.innerHTML = '<li class="rows__empty">' + UI.empty + '</li>'; return; }
    ul.innerHTML = current.map(function (p) {
      return '<li class="row row--compact" tabindex="0" role="button" data-id="' + esc(p.id) + '" aria-current="' + (p.id === state.p ? "true" : "false") + '"' +
        ' style="--cat:' + SH.cat(p.room) + '">' +
        '<p class="row__title">' + esc(title(p)) + '</p>' +
        '<div class="row__meta">' +
          (p.oral ? '<span class="badge badge--oral">ORAL</span>' : "") +
          (p.day ? '<span>' + esc(SH.fmtDay(p.day)) + '</span>' : "") +
          (p.room ? '<span class="badge badge--cat" style="--cat:' + SH.cat(p.room) + '">' + esc(p.room) + (p.posterNumber ? ' #' + p.posterNumber : "") + '</span>' : "") +
          (p.topic ? '<span class="badge">' + esc(topicLabel(p.topic)) + '</span>' : "") +
        '</div></li>';
    }).join("");
    [].forEach.call(ul.children, function (li) {
      li.addEventListener("click", function () { select(li.dataset.id, true); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(li.dataset.id, true); } });
    });
  }

  /* ---------- abstracts: lazy second file ---------- */
  var abstractsState = "idle";   // idle | loading | ready | failed
  function ensureAbstracts(cb) {
    if (window.PAPERS_ABSTRACTS) { abstractsState = "ready"; cb(); return; }
    if (abstractsState === "loading") { document.addEventListener("papers:abstracts", cb, { once: true }); return; }
    abstractsState = "loading";
    var s = document.createElement("script");
    s.src = SH.root + "data/papers-abstracts." + lang + ".js";
    s.onload = function () { abstractsState = "ready"; document.dispatchEvent(new Event("papers:abstracts")); cb(); };
    s.onerror = function () { abstractsState = "failed"; document.dispatchEvent(new Event("papers:abstracts")); cb(); };
    document.head.appendChild(s);
  }
  function abstractOf(id) { var A = window.PAPERS_ABSTRACTS || {}; return A[id] || null; }

  /* ---------- detail ---------- */
  function byId(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
  function link(label, url, icon, primary) {
    if (!url) return "";
    return '<a class="linkbtn' + (primary ? " linkbtn--primary" : "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="material-symbols-rounded" aria-hidden="true">' + icon + '</span>' + esc(label) + '</a>';
  }
  function abstractHtml(p) {
    var abs = abstractOf(p.id);
    if (abs) return esc(abs);
    return '<em>' + (abstractsState === "ready" || abstractsState === "failed" ? UI.noAbstract : UI.loading) + '</em>';
  }
  function detailHtml(p) {
    if (!p) return '<div class="detail detail--empty"><div><span class="material-symbols-rounded" aria-hidden="true">article</span><p>' + esc(UI.pick) + '</p></div></div>';
    var idx = current.indexOf(p);
    var prev = idx > 0 ? current[idx - 1] : null, next = idx >= 0 && idx < current.length - 1 ? current[idx + 1] : null;
    var affil = uniq(p.affiliations || []);
    var L = p.links || {};
    return '<article class="detail" aria-live="polite">' +
      '<div class="detail__kicker">' +
        (p.oral ? '<span class="badge badge--oral">ORAL' + (p.oralSession ? ' · ' + esc(p.oralSession) : "") + '</span>' : "") +
        (p.day ? '<span class="badge">' + esc(SH.fmtDay(p.day, true)) + (p.time ? ' · ' + esc(SH.fmtTime(p.time)) : "") + '</span>' : "") +
        (p.room ? '<span class="badge badge--cat" style="--cat:' + SH.cat(p.room) + '">' + esc(p.room) + (p.posterNumber ? ' #' + p.posterNumber : "") + '</span>' : "") +
        (p.topic ? '<span class="badge">' + esc(topicLabel(p.topic)) + '</span>' : "") +
      '</div>' +
      '<h2 class="detail__title">' + esc(title(p)) + '</h2>' +
      (lang === "zh" && p.titleZh ? '<p class="detail__affil" style="margin-top:-6px">' + esc(p.title) + '</p>' : "") +
      '<p class="detail__authors">' + esc((p.authors || []).join(" · ")) + '</p>' +
      (affil.length ? '<p class="detail__affil">' + esc(affil.join(" · ")) + '</p>' : "") +
      '<h3>' + UI.abstract + '</h3>' +
      '<p class="detail__abstract" data-abstract="' + esc(p.id) + '">' + abstractHtml(p) + '</p>' +
      '<h3>' + UI.where + '</h3>' +
      '<dl class="detail__facts">' +
        '<div><dt>' + UI.presentation + '</dt><dd>' + (p.oral ? UI.oralIn : UI.posterOnly) + '</dd></div>' +
        (p.oral && p.oralTime ? '<div><dt>' + UI.oralSlot + '</dt><dd>' + esc(SH.fmtTime(p.oralTime)) + (p.oralRoom ? ' · ' + esc(p.oralRoom) : "") + '</dd></div>' : "") +
        (p.posterSession ? '<div><dt>' + UI.posterSession + '</dt><dd>' + p.posterSession + '</dd></div>' : "") +
        (p.day ? '<div><dt>' + UI.day + '</dt><dd>' + esc(SH.fmtDay(p.day, true)) + '</dd></div>' : "") +
        (p.time ? '<div><dt>' + UI.time + '</dt><dd>' + esc(SH.fmtTime(p.time)) + '</dd></div>' : "") +
        (p.room ? '<div><dt>' + UI.room2 + '</dt><dd>' + esc(p.room) + '</dd></div>' : "") +
        (p.posterNumber ? '<div><dt>' + UI.board + '</dt><dd>#' + p.posterNumber + '</dd></div>' : "") +
        (p.topic ? '<div><dt>' + UI.topic2 + '</dt><dd>' + esc(topicLabel(p.topic)) + '</dd></div>' : "") +
      '</dl>' +
      '<div class="detail__links">' +
        link(UI.colm, L.colm, "open_in_new", true) + link(UI.openreview, L.openreview, "rate_review") +
        link(UI.pdf, L.pdf, "picture_as_pdf") + link(UI.project, L.project, "language") +
      '</div>' +
      '<div class="detail__nav">' +
        (prev ? '<button type="button" class="linkish" data-go="' + esc(prev.id) + '">← ' + UI.prev + '</button>' : "<span></span>") +
        (next ? '<button type="button" class="linkish" data-go="' + esc(next.id) + '">' + UI.next + ' →</button>' : "<span></span>") +
      '</div></article>';
  }
  function wireDetail(root) {
    [].forEach.call(root.querySelectorAll("[data-go]"), function (b) { b.addEventListener("click", function () { select(b.dataset.go, true); }); });
  }
  /* fill the abstract paragraph(s) in place once the lazy file arrives */
  function fillAbstract(p) {
    [].forEach.call(document.querySelectorAll('[data-abstract="' + p.id + '"]'), function (el) { el.innerHTML = abstractHtml(p); });
  }
  function paintDetail(viaClick) {
    var p = state.p ? byId(state.p) : null;
    var h = detailHtml(p);
    $("detail").innerHTML = h; wireDetail($("detail"));
    if (p && viaClick && SH.isNarrow()) { SH.openDialog(h); wireDetail($("dialogBody")); }
    if (p && !abstractOf(p.id) && abstractsState !== "failed") ensureAbstracts(function () { fillAbstract(p); });
    if (p) document.title = title(p) + " · COLM 2026";
  }
  function select(id, viaClick) {
    state.p = id;
    [].forEach.call($("list").children, function (li) { li.setAttribute("aria-current", li.dataset.id === id ? "true" : "false"); });
    paintDetail(viaClick);
    writeUrl();
    var d = $("detail"); if (d && !SH.isNarrow()) d.scrollTop = 0;
  }

  function update(repaintFilters) {
    current = ALL.filter(matches);
    if (repaintFilters) paintFilters();
    paintList();
    paintDetail(false);
    writeUrl();
  }

  /* ---------- boot ---------- */
  readUrl();
  paintFilters();
  update(false);
  if (state.p && SH.isNarrow()) paintDetail(true);
  // warm the abstracts file once the page is idle so the first click feels instant
  (window.requestIdleCallback || function (f) { setTimeout(f, 800); })(function () { ensureAbstracts(function () {}); });
})();
