/* =========================================================================
   COLM 2026 · shell.js — chrome shared by every page

   Owns: top navigation (About ▾ · Schedule · Accepted Papers · Workshops),
   the mobile drawer, the theme toggle, the language link, the footer text,
   and a handful of helpers the page scripts reuse (t, esc, dialog, colours).

   Language is decided by the URL: the generator writes <html lang="en"> or
   <html lang="zh-Hant"> and <body data-root="../"> (relative path back to
   the site root), so this file never guesses from storage or the browser.
   ========================================================================= */
window.SHELL = (function () {
  "use strict";

  var ZH_DIR = "zh/";                       // where the Chinese tree lives
  var html = document.documentElement;
  var body = document.body;
  var lang = (html.getAttribute("lang") || "en").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
  var ROOT = body.getAttribute("data-root") || "./";          // e.g. "../" from /papers/
  var PAGE = body.getAttribute("data-page") || "about";        // about | schedule | papers | workshops
  var LANG_ROOT  = ROOT + (lang === "zh" ? ZH_DIR : "");
  var OTHER_ROOT = ROOT + (lang === "zh" ? "" : ZH_DIR);

  /* ---------- i18n for the chrome ---------- */
  var I18N = {
    en: { about: "About", schedule: "Schedule", papers: "Accepted Papers", workshops: "Workshops",
          menu: "Menu", close: "Close", footer: "Unofficial community page · content curated from colm.cc · static, no build step.",
          langLabel: "中文", langAria: "切換到中文版", themeAria: "Toggle theme",
          sections: { overview: "Overview", about: "About COLM", timeline: "Key dates", topics: "Topics",
                      workshops: "Workshops", people: "Organizers", faq: "FAQ", policies: "Guidelines & policies", submit: "Attend" } },
    zh: { about: "關於", schedule: "議程", papers: "接受論文", workshops: "工作坊",
          menu: "選單", close: "關閉", footer: "非官方社群整理頁 · 內容整理自 colm.cc · 純靜態，無建置流程。",
          langLabel: "EN", langAria: "Switch to English", themeAria: "切換主題",
          sections: { overview: "總覽", about: "關於 COLM", timeline: "重要日期", topics: "徵稿主題",
                      workshops: "工作坊", people: "組織成員", faq: "常見問題", policies: "指南與政策", submit: "參加" } }
  };
  var S = I18N[lang];

  /* ---------- helpers ---------- */
  function t(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || obj.zh || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function $(id) { return document.getElementById(id); }

  /* Stable categorical colours: known rooms / session types get a fixed slot
     so the same room is the same colour on every page; unknown names are
     assigned the next free slot in order of first appearance. */
  var CAT_FIXED = {
    "grand ballroom": 1, "imperial ballroom": 2, "franciscan a": 3, "franciscan b": 4,
    "franciscan c": 5, "franciscan": 3,
    keynote: 1, oral: 2, poster: 3, panel: 4, workshop: 5, remarks: 8, break: 8, social: 6, other: 8
  };
  var catNext = 6, catMap = {};
  function cat(name) {
    var k = String(name || "").toLowerCase().trim();
    if (CAT_FIXED[k]) return "var(--cat-" + CAT_FIXED[k] + ")";
    if (!catMap[k]) { catMap[k] = catNext; catNext = catNext >= 8 ? 6 : catNext + 1; }
    return "var(--cat-" + catMap[k] + ")";
  }

  /* Day / time formatting (dates are ISO "2026-10-06", times "HH:MM") */
  var WD = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], zh: ["日", "一", "二", "三", "四", "五", "六"] };
  function fmtDay(iso, long) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    var wd = WD[lang][d.getUTCDay()];
    if (lang === "zh") return long ? (d.getMonth() + 1) + " 月 " + d.getDate() + " 日（" + wd + ")" : (d.getMonth() + 1) + "/" + d.getDate() + "(" + wd + ")";
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
    return long ? wd + ", " + mon + " " + d.getDate() : wd + " " + mon + " " + d.getDate();
  }
  function fmtTime(hhmm) {
    if (!hhmm) return "";
    if (lang === "zh") return hhmm;
    var p = hhmm.split(":"), h = +p[0], m = p[1];
    var ap = h >= 12 ? "PM" : "AM"; h = h % 12; if (h === 0) h = 12;
    return h + ":" + m + " " + ap;
  }

  /* ---------- top nav ---------- */
  var NAV = [
    { key: "about",     href: "",           icon: "info",           label: S.about },
    { key: "schedule",  href: "schedule/",  icon: "calendar_month", label: S.schedule },
    { key: "papers",    href: "papers/",    icon: "article",        label: S.papers },
    { key: "workshops", href: "workshops/", icon: "groups",         label: S.workshops }
  ];
  var ABOUT_SECTIONS = ["overview", "about", "timeline", "topics", "workshops", "people", "faq", "policies", "submit"];
  var SEC_ICONS = { overview: "home", about: "info", timeline: "event", topics: "category", workshops: "groups",
                    people: "person", faq: "help", policies: "gavel", submit: "confirmation_number" };

  function aboutMenuHtml(cls) {
    return ABOUT_SECTIONS.map(function (id) {
      return '<a href="' + LANG_ROOT + '#' + id + '" class="' + (cls || "") + '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">' + SEC_ICONS[id] + '</span>' +
        esc(S.sections[id]) + '</a>';
    }).join("");
  }

  function paintTopNav() {
    var nav = $("topnav");
    if (!nav) return;
    nav.innerHTML = NAV.map(function (n) {
      var active = n.key === PAGE ? " topnav__link--active" : "";
      if (n.key === "about") {
        return '<div class="topnav__item" id="aboutItem">' +
          '<button class="topnav__btn' + active + '" type="button" id="aboutBtn" aria-haspopup="true" aria-expanded="false">' +
            esc(n.label) + '<span class="material-symbols-rounded" aria-hidden="true">expand_more</span></button>' +
          '<div class="menu" role="menu">' + aboutMenuHtml() + '</div></div>';
      }
      return '<a class="topnav__link' + active + '" href="' + LANG_ROOT + n.href + '"' +
             (n.key === PAGE ? ' aria-current="page"' : "") + '>' + esc(n.label) + '</a>';
    }).join("");

    var item = $("aboutItem"), btn = $("aboutBtn"), byHover = false;
    var canHover = window.matchMedia("(hover:hover)").matches;
    function isOpen() { return item.getAttribute("data-open") === "true"; }
    function setOpen(v) { item.setAttribute("data-open", v ? "true" : "false"); btn.setAttribute("aria-expanded", v ? "true" : "false"); if (!v) byHover = false; }
    /* hover opens (desktop), and the click that usually follows must NOT close it again;
       a click only toggles when the menu was opened by a click / keyboard. */
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isOpen() && !byHover) setOpen(false); else { setOpen(true); byHover = false; }
    });
    document.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    item.addEventListener("mouseenter", function () { if (canHover && !isOpen()) { setOpen(true); byHover = true; } });
    item.addEventListener("mouseleave", function () { if (canHover && byHover) setOpen(false); });
  }

  function paintDrawer() {
    var drawer = $("drawer"), backdrop = $("drawerBackdrop"), btn = $("menuBtn");
    if (!drawer || !btn) return;
    drawer.innerHTML =
      '<div class="drawer__head"><span class="drawer__title">COLM 2026</span>' +
      '<button class="icon-btn" type="button" id="drawerClose" aria-label="' + esc(S.close) + '">' +
      '<span class="material-symbols-rounded">close</span></button></div>' +
      NAV.map(function (n) {
        var active = n.key === PAGE ? " topnav__link--active" : "";
        var a = '<a class="' + active + '" href="' + LANG_ROOT + n.href + '"><span class="material-symbols-rounded" aria-hidden="true">' + n.icon + '</span>' + esc(n.label) + '</a>';
        if (n.key === "about") a += '<div class="drawer__sub">' + aboutMenuHtml() + '</div>';
        return a;
      }).join("") +
      '<div class="drawer__group"><a href="' + otherLangHref() + '" hreflang="' + (lang === "zh" ? "en" : "zh-Hant") + '" rel="alternate">' +
      '<span class="material-symbols-rounded" aria-hidden="true">translate</span>' + esc(S.langLabel) + '</a></div>';
    function setOpen(v) {
      drawer.setAttribute("data-open", v ? "true" : "false");
      backdrop.setAttribute("data-open", v ? "true" : "false");
      btn.setAttribute("aria-expanded", v ? "true" : "false");
    }
    btn.addEventListener("click", function () { setOpen(true); });
    backdrop.addEventListener("click", function () { setOpen(false); });
    $("drawerClose").addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- language link (keeps query + hash so deep links survive) ---------- */
  var PAGE_PATH = { about: "", schedule: "schedule/", papers: "papers/", workshops: "workshops/" };
  function otherLangHref() {
    return OTHER_ROOT + (PAGE_PATH[PAGE] || "") + location.search + location.hash;
  }
  function paintLang() {
    var a = $("langToggle");
    if (!a) return;
    a.href = otherLangHref();
    a.setAttribute("aria-label", S.langAria);
    var txt = a.querySelector(".icon-btn__txt");
    if (txt) txt.textContent = S.langLabel;
    window.addEventListener("hashchange", function () { a.href = otherLangHref(); });
  }

  /* ---------- theme ---------- */
  var theme = lsGet("theme") || "light";
  function applyTheme() {
    html.setAttribute("data-theme", theme);
    var icon = $("themeIcon");
    if (icon) icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
    lsSet("theme", theme);
  }
  function wireTheme() {
    var b = $("themeToggle");
    if (!b) return;
    b.setAttribute("aria-label", S.themeAria);
    b.addEventListener("click", function () { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });
  }

  /* ---------- footer ---------- */
  function paintFooter() {
    var f = $("footerText");
    if (f) f.textContent = S.footer;
    var m = $("menuBtn");
    if (m) m.setAttribute("aria-label", S.menu);
  }

  /* ---------- shared <dialog> (page scripts put arbitrary HTML in it) ---------- */
  var dialog = null;
  function openDialog(htmlStr) {
    dialog = dialog || $("dialog");
    if (!dialog) return;
    $("dialogBody").innerHTML = htmlStr;
    if (!dialog.open) dialog.showModal();
    $("dialogBody").scrollTop = 0;
  }
  function closeDialog() { if (dialog && dialog.open) dialog.close(); }
  function wireDialog() {
    dialog = $("dialog");
    if (!dialog) return;
    $("dialogClose").setAttribute("aria-label", S.close);
    $("dialogClose").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (e) { if (e.target === dialog) closeDialog(); });
  }
  function isNarrow() { return window.matchMedia("(max-width: 900px)").matches; }

  /* ---------- boot ---------- */
  applyTheme();
  paintTopNav();
  paintDrawer();
  paintLang();
  wireTheme();
  paintFooter();
  wireDialog();

  return { lang: lang, root: ROOT, langRoot: LANG_ROOT, page: PAGE, t: t, esc: esc, cat: cat,
           fmtDay: fmtDay, fmtTime: fmtTime, openDialog: openDialog, closeDialog: closeDialog,
           isNarrow: isNarrow, $: $ };
})();
