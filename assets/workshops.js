/* =========================================================================
   COLM 2026 · workshops.js — Workshops (list left, detail right)

   Data: window.WORKSHOPS_DATA = { workshops: [...] }
   Each: { id, name, shortName, edition, contact, organizers[], date, startTime,
           endTime, room, website, colmUrl, description: {en, zh}, topics: {en:[], zh:[]}|null,
           schedule: [{time, title, speaker}]|null, speakers[]|null,
           deadlines: [{label:{en,zh}, date, note}]|null, links: {...},
           paperSessions: [{time, title}], papers: [{id (colm.cc), title, titleZh, authors[], session: index|null}] }
   Search matches workshop names/descriptions and accepted-paper titles/authors; a paper match
   also narrows the paper list in the detail pane.
   Deep link: #<id>
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var ALL = (window.WORKSHOPS_DATA && window.WORKSHOPS_DATA.workshops) || [];

  var UI = {
    en: { pick: "Pick a workshop on the left to see what it is about, its program and official links.",
          about: "About", organizers: "Organizers", speakers: "Invited speakers", program: "Program", deadlines: "Key dates",
          topics: "Topics", links: "Links", website: "Official website", colm: "colm.cc page", cfp: "Call for papers",
          when: "When", room: "Room", contact: "Contact", tbd: "TBA", count: "workshops · Friday, October 9, 2026", prev: "Previous", next: "Next",
          search: "Search workshops, papers, authors", noProgram: "The day-of program has not been published yet — check the official website.",
          papers: "Accepted papers", nPapers: "papers", unassigned: "Session not listed on colm.cc", matching: "matching",
          showAll: "Show all papers", papersNote: "From the workshop's page on colm.cc." },
    zh: { pick: "點選左側任一工作坊，這裡會顯示簡介、當日議程與官方連結。",
          about: "簡介", organizers: "主辦人", speakers: "邀請講者", program: "當日議程", deadlines: "重要日期",
          topics: "主題", links: "連結", website: "官方網站", colm: "colm.cc 頁面", cfp: "徵稿",
          when: "時間", room: "房間", contact: "聯絡人", tbd: "待公布", count: "場工作坊 · 2026 年 10 月 9 日（五）", prev: "上一個", next: "下一個",
          search: "搜尋工作坊、論文、作者", noProgram: "當日議程尚未公布，請以官方網站為準。",
          papers: "接受論文", nPapers: "篇", unassigned: "colm.cc 未標明場次", matching: "符合",
          showAll: "顯示全部論文", papersNote: "論文清單取自 colm.cc 各工作坊頁面。" }
  }[lang];

  var q = "";
  var selected = location.hash ? location.hash.slice(1) : null;
  function byId(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
  function paperHit(p, s) { return (p.title + " " + (p.titleZh || "") + " " + p.authors.join(" ")).toLowerCase().indexOf(s) >= 0; }
  function paperMatches(w) {
    if (!q) return null;
    var s = q.toLowerCase();
    return (w.papers || []).filter(function (p) { return paperHit(p, s); });
  }
  function visible() {
    if (!q) return ALL;
    var s = q.toLowerCase();
    return ALL.filter(function (w) {
      return (w.name + " " + (w.shortName || "") + " " + t(w.description)).toLowerCase().indexOf(s) >= 0 || paperMatches(w).length;
    });
  }

  function paintList() {
    var list = visible();
    $("countN").textContent = list.length;
    $("list").innerHTML = list.map(function (w) {
      return '<li class="row" tabindex="0" role="button" data-id="' + esc(w.id) + '" aria-current="' + (w.id === selected ? "true" : "false") + '"' +
        ' style="--cat:' + SH.cat(w.room || "workshop") + '">' +
        '<p class="row__title">' + esc(w.name) + '</p>' +
        '<div class="row__meta">' +
          (w.shortName ? '<span class="badge">' + esc(w.shortName) + '</span>' : "") +
          (w.room ? '<span class="badge badge--cat" style="--cat:' + SH.cat(w.room) + '">' + esc(w.room) + '</span>' : "") +
          '<span>' + esc(SH.fmtTime(w.startTime)) + (w.endTime ? "–" + esc(SH.fmtTime(w.endTime)) : "") + '</span>' +
          (w.papers && w.papers.length ? '<span>' + (q && paperMatches(w).length ? paperMatches(w).length + " / " : "") + w.papers.length + ' ' + UI.nPapers + '</span>' : "") +
        '</div></li>';
    }).join("");
    [].forEach.call($("list").children, function (li) {
      li.addEventListener("click", function () { select(li.dataset.id, true); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(li.dataset.id, true); } });
    });
  }

  function link(label, url, icon, primary) {
    if (!url) return "";
    return '<a class="linkbtn' + (primary ? " linkbtn--primary" : "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="material-symbols-rounded" aria-hidden="true">' + icon + '</span>' + esc(label) + '</a>';
  }
  function papersHtml(w) {
    var all = w.papers || [];
    if (!all.length) return "";
    var hits = paperMatches(w), shown = hits && hits.length ? hits : all;
    var groups = (w.paperSessions || []).map(function (sess) { return { sess: sess, items: [] }; });
    var loose = [];
    shown.forEach(function (p) { if (p.session != null && groups[p.session]) groups[p.session].items.push(p); else loose.push(p); });
    if (loose.length) groups.push({ sess: groups.length ? { time: null, title: UI.unassigned } : null, items: loose });
    function item(p) {
      var zhT = lang === "zh" && p.titleZh;
      return '<li><a href="https://colm.cc/virtual/2026/' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener">' + esc(zhT ? p.titleZh : p.title) + '</a>' +
        (zhT ? '<small class="wp__en">' + esc(p.title) + '</small>' : "") +
        '<small>' + esc(p.authors.join(", ")) + '</small></li>';
    }
    return '<h3>' + UI.papers + ' <span class="wp__n">' + (shown === all ? all.length : shown.length + " / " + all.length) + '</span></h3>' +
      (shown !== all ? '<p class="note">' + UI.matching + ' “' + esc(q) + '” · <button type="button" class="linkish" id="wpAll">' + UI.showAll + '</button></p>' : "") +
      groups.filter(function (g) { return g.items.length; }).map(function (g) {
        return (g.sess ? '<p class="wp__sess">' + (g.sess.time ? '<b>' + esc(SH.fmtTime(g.sess.time)) + '</b> ' : "") + esc(g.sess.title) +
          ' <span class="wp__n">' + g.items.length + '</span></p>' : "") +
          '<ol class="wp">' + g.items.map(item).join("") + '</ol>';
      }).join("") +
      '<p class="note">' + UI.papersNote + '</p>';
  }
  function list(items) { return items && items.length ? '<ul>' + items.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>' : ""; }

  function detailHtml(w) {
    if (!w) return '<div class="detail detail--empty"><div><span class="material-symbols-rounded" aria-hidden="true">groups</span><p>' + esc(UI.pick) + '</p></div></div>';
    var idx = ALL.indexOf(w), prev = idx > 0 ? ALL[idx - 1] : null, next = idx < ALL.length - 1 ? ALL[idx + 1] : null;
    var L = w.links || {};
    var topics = w.topics ? (Array.isArray(w.topics) ? w.topics : (w.topics[lang] || w.topics.en || [])) : [];
    return '<article class="detail" aria-live="polite">' +
      '<div class="detail__kicker">' +
        '<span class="badge">' + esc(SH.fmtDay(w.date, true)) + ' · ' + esc(SH.fmtTime(w.startTime)) + (w.endTime ? "–" + esc(SH.fmtTime(w.endTime)) : "") + '</span>' +
        (w.room ? '<span class="badge badge--cat" style="--cat:' + SH.cat(w.room) + '">' + esc(w.room) + '</span>' : "") +
        (w.edition ? '<span class="badge">' + esc(w.edition) + '</span>' : "") +
      '</div>' +
      '<h2 class="detail__title">' + esc(w.name) + '</h2>' +
      '<div class="detail__links">' + link(UI.website, w.website, "language", true) + link(UI.colm, w.colmUrl, "open_in_new") + link(UI.cfp, L.cfp, "campaign") + '</div>' +
      '<h3>' + UI.about + '</h3><p>' + esc(t(w.description)) + '</p>' +
      (topics.length ? '<h3>' + UI.topics + '</h3><div class="detail__kicker">' + topics.map(function (x) { return '<span class="badge badge--wrap">' + esc(x) + '</span>'; }).join("") + '</div>' : "") +
      '<h3>' + UI.program + '</h3>' +
      (w.schedule && w.schedule.length
        ? '<table>' + w.schedule.map(function (s) { return '<tr><td>' + esc(s.time || "") + '</td><td>' + esc(t(s.title)) + (s.speaker ? '<br><small style="color:var(--on-surface-variant)">' + esc(s.speaker) + '</small>' : "") + '</td></tr>'; }).join("") + '</table>'
        : '<p class="note">' + UI.noProgram + '</p>') +
      papersHtml(w) +
      (w.speakers && w.speakers.length ? '<h3>' + UI.speakers + '</h3>' + list(w.speakers) : "") +
      (w.deadlines && w.deadlines.length
        ? '<h3>' + UI.deadlines + '</h3><table>' + w.deadlines.map(function (d) { return '<tr><td>' + esc(d.date || "") + '</td><td>' + esc(t(d.label)) + (d.note ? ' <small style="color:var(--on-surface-variant)">(' + esc(d.note) + ')</small>' : "") + '</td></tr>'; }).join("") + '</table>'
        : "") +
      (w.organizers && w.organizers.length ? '<h3>' + UI.organizers + '</h3>' + list(w.organizers) : "") +
      (w.contact ? '<h3>' + UI.contact + '</h3><p>' + esc(w.contact) + '</p>' : "") +
      '<div class="detail__nav">' +
        (prev ? '<button type="button" class="linkish" data-go="' + esc(prev.id) + '">← ' + UI.prev + '</button>' : "<span></span>") +
        (next ? '<button type="button" class="linkish" data-go="' + esc(next.id) + '">' + UI.next + ' →</button>' : "<span></span>") +
      '</div></article>';
  }
  function wireDetail(root) {
    [].forEach.call(root.querySelectorAll("[data-go]"), function (b) { b.addEventListener("click", function () { select(b.dataset.go, true); }); });
    var all = root.querySelector("#wpAll");
    if (all) all.addEventListener("click", function () { q = ""; $("q").value = ""; paintList(); paintDetail(false); });
  }
  function paintDetail(viaClick) {
    var w = selected ? byId(selected) : null;
    var h = detailHtml(w);
    $("detail").innerHTML = h; wireDetail($("detail"));
    if (w && viaClick && SH.isNarrow()) { SH.openDialog(h); wireDetail($("dialogBody")); }
    if (w) document.title = w.name + " · COLM 2026";
  }
  function select(id, viaClick) {
    selected = id;
    [].forEach.call($("list").children, function (li) { li.setAttribute("aria-current", li.dataset.id === id ? "true" : "false"); });
    paintDetail(viaClick);
    if (location.hash.slice(1) !== id) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    var la = $("langToggle"); if (la) la.href = la.href.split("#")[0] + "#" + id;
  }

  $("q").placeholder = UI.search;
  $("q").addEventListener("input", function (e) { q = e.target.value.trim(); paintList(); if (selected) paintDetail(false); });
  $("countLabel").textContent = UI.count;
  paintList();
  paintDetail(!!selected);
  window.addEventListener("hashchange", function () { var id = location.hash.slice(1); if (id && byId(id)) select(id, true); });
})();
