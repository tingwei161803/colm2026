/* =========================================================================
   COLM 2026 · schedule.js — Program by day + key dates

   Data: window.SCHEDULE_DATA = { timezone, venue, days: [...], keyDates: [...] }
   day: { date, weekday, label: {en, zh}, sessions: [ { id, start, end, type, title: {en, zh},
          room, speaker: {name, affiliation, talkTitle: {en,zh}|string, url}|null,
          papers: [{ title, authors[], paperId|null, colmUrl }]|null, paperCount, rooms[], colmUrl, notes } ] }
   keyDates: [{ group: {en,zh}, label: {en,zh}, date, time, timezone, note }]
   URL: #d=2026-10-07 (selected tab) — plain hash so it survives the language switch.
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var D = window.SCHEDULE_DATA || { days: [], keyDates: [] };

  var UI = {
    en: { keyDates: "Key dates", papers: "papers", showPapers: "Show papers in this session", browse: "Browse posters in this session",
          allWorkshops: "See all workshops", legend: "Session type", tz: "All times are Pacific (PDT), as printed on colm.cc.",
          types: { keynote: "Keynote", oral: "Oral", poster: "Poster", panel: "Panel", remarks: "Remarks", break: "Break", workshop: "Workshop", social: "Social", other: "Other" },
          aoe: "AoE = Anywhere on Earth", room: "Room", dayN: "Day" },
    zh: { keyDates: "重要日期", papers: "篇", showPapers: "展開本場論文", browse: "瀏覽本場海報",
          allWorkshops: "查看所有工作坊", legend: "場次類型", tz: "時間皆為太平洋時間（PDT），依 colm.cc 所列。",
          types: { keynote: "主題演講", oral: "口頭報告", poster: "海報", panel: "座談", remarks: "致詞", break: "休息", workshop: "工作坊", social: "社交", other: "其他" },
          aoe: "AoE = 地球任一時區", room: "房間", dayN: "第" }
  }[lang];

  var KEY = "dates";
  var tabs = D.days.map(function (d) { return d.date; }).concat([KEY]);
  var active = (location.hash.match(/d=([^&]+)/) || [])[1];
  if (tabs.indexOf(active) < 0) active = tabs[0];

  function paintTabs() {
    $("daytabs").innerHTML = D.days.map(function (d, i) {
      return '<button type="button" class="daytab" role="tab" aria-selected="' + (d.date === active ? "true" : "false") + '" data-d="' + d.date + '">' +
        esc(SH.fmtDay(d.date)) + '<small>' + esc(t(d.label)) + '</small></button>';
    }).join("") +
    '<button type="button" class="daytab" role="tab" aria-selected="' + (active === KEY ? "true" : "false") + '" data-d="' + KEY + '">' +
      esc(UI.keyDates) + '<small>' + (lang === "zh" ? "投稿・註冊・贊助" : "submission · registration") + '</small></button>';
    [].forEach.call($("daytabs").children, function (b) {
      b.addEventListener("click", function () { active = b.dataset.d; history.replaceState(null, "", location.pathname + location.search + "#d=" + active); paintTabs(); paintBody(); });
    });
  }

  function legend() {
    var types = ["keynote", "oral", "poster", "panel", "workshop", "remarks"];
    return '<div class="legend" aria-label="' + UI.legend + '">' + types.map(function (k) {
      return '<span><span class="chip__dot" style="--cat:' + SH.cat(k) + '"></span>' + esc(UI.types[k]) + '</span>';
    }).join("") + '</div>';
  }

  function speakerHtml(s) {
    if (!s) return "";
    var name = s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : esc(s.name);
    return '<p class="prog__sub"><b>' + name + '</b>' + (s.affiliation ? ' · ' + esc(s.affiliation) : "") +
      (s.talkTitle ? '<br>“' + esc(t(s.talkTitle)) + '”' : "") + '</p>';
  }

  function sessionHtml(s) {
    var papersRoot = SH.langRoot + "papers/";
    var inner = "";
    if (s.type === "oral" && s.papers && s.papers.length) {
      inner = '<details><summary><span class="material-symbols-rounded" aria-hidden="true">expand_more</span>' + UI.showPapers + ' (' + s.papers.length + ')</summary>' +
        '<ol class="prog__papers">' + s.papers.map(function (p) {
          var href = p.paperId ? papersRoot + "?p=" + encodeURIComponent(p.paperId) : (p.colmUrl || "#");
          return '<li><a href="' + esc(href) + '">' + esc(p.title) + '</a><small>' + esc((p.authors || []).join(", ")) + '</small></li>';
        }).join("") + '</ol></details>';
    } else if (s.type === "poster") {
      var n = (s.title && (s.title.en || "")).match(/(\d+)/), sess = n ? n[1] : null;
      inner = '<div class="prog__actions"><a class="linkbtn" href="' + papersRoot + (sess ? "?s=" + sess : "") + '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">article</span>' + UI.browse + (s.paperCount ? ' (' + s.paperCount + ')' : "") + '</a></div>';
    } else if (s.type === "workshop" && s.workshops && s.workshops.length) {
      inner = '<div class="prog__grid">' + s.workshops.map(function (w) {
        return '<a href="' + SH.langRoot + 'workshops/#' + esc(w.id) + '">' + esc(w.name) + (w.room ? '<br><small style="color:var(--on-surface-variant)">' + esc(w.room) + '</small>' : "") + '</a>';
      }).join("") + '</div>' +
      '<div class="prog__actions"><a class="linkbtn" href="' + SH.langRoot + 'workshops/"><span class="material-symbols-rounded" aria-hidden="true">groups</span>' + UI.allWorkshops + '</a></div>';
    }
    var rooms = s.rooms && s.rooms.length ? s.rooms.join(" · ") : s.room;
    return '<li class="prog" style="--cat:' + SH.cat(s.type) + '">' +
      '<div class="prog__time"><b>' + esc(SH.fmtTime(s.start)) + '</b>' + (s.end ? esc(SH.fmtTime(s.end)) : "") + '</div>' +
      '<div class="prog__body"><div class="prog__top">' +
        '<span class="badge badge--cat" style="--cat:' + SH.cat(s.type) + '">' + esc(UI.types[s.type] || s.type) + '</span>' +
        (rooms ? '<span class="prog__room"><span class="material-symbols-rounded" aria-hidden="true">location_on</span>' + esc(rooms) + '</span>' : "") +
      '</div>' +
      '<h3 class="prog__title">' + (s.colmUrl ? '<a href="' + esc(s.colmUrl) + '" target="_blank" rel="noopener">' + esc(t(s.title)) + '</a>' : esc(t(s.title))) + '</h3>' +
      speakerHtml(s.speaker) +
      (s.panelists && s.panelists.length ? '<p class="prog__sub">' + s.panelists.map(function (x) {
        return (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.name) + '</b></a>' : '<b>' + esc(x.name) + '</b>') + (x.affiliation ? ' (' + esc(x.affiliation) + ')' : "");
      }).join(" · ") + '</p>' : "") +
      (s.roomAssignments && s.roomAssignments.length ? '<p class="prog__sub">' + s.roomAssignments.map(function (r) {
        return '<span class="badge badge--cat" style="--cat:' + SH.cat(r.room) + '">' + esc(r.room) + ' ' + esc(r.posters) + '</span>';
      }).join(" ") + '</p>' : "") +
      (s.notes ? '<p class="prog__sub">' + esc(t(s.notes)) + '</p>' : "") +
      inner + '</div></li>';
  }

  function dayHtml(d) {
    return '<div class="day-head"><h2>' + esc(SH.fmtDay(d.date, true)) + '</h2><span>' + esc(t(d.label)) + '</span></div>' +
      legend() + '<ol class="program">' + d.sessions.map(sessionHtml).join("") + '</ol>' +
      '<p class="note" style="margin-top:12px">' + UI.tz + '</p>';
  }

  function keyDatesHtml() {
    var groups = [];
    D.keyDates.forEach(function (k) {
      var g = t(k.group), G = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].name === g) G = groups[i];
      if (!G) { G = { name: g, items: [] }; groups.push(G); }
      G.items.push(k);
    });
    return '<div class="day-head"><h2>' + UI.keyDates + '</h2><span>' + UI.aoe + '</span></div>' +
      groups.map(function (g) {
        return '<li class="prog" style="--cat:var(--cat-1)"><div class="prog__time"><b>' + esc(g.name) + '</b></div><div class="prog__body"><table>' +
          g.items.map(function (k) {
            return '<tr><td>' + esc(k.date || "") + (k.time ? ' ' + esc(k.time) : "") + (k.timezone ? ' <small>' + esc(k.timezone) + '</small>' : "") + '</td><td>' + esc(t(k.label)) + (k.note ? ' <small style="color:var(--on-surface-variant)">' + esc(t(k.note)) + '</small>' : "") + '</td></tr>';
          }).join("") + '</table></div></li>';
      }).join("");
  }

  function paintBody() {
    var el = $("program");
    if (active === KEY) { el.innerHTML = '<ol class="program">' + keyDatesHtml() + '</ol>'; return; }
    var d = null; D.days.forEach(function (x) { if (x.date === active) d = x; });
    el.innerHTML = d ? dayHtml(d) : "";
  }

  paintTabs();
  paintBody();
})();
