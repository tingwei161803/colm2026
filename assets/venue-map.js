/* =========================================================================
   COLM 2026 · venue-map.js — Hilton Union Square floor plan with markers

   Background: the venue's own floor-plan poster, cropped per level
   (assets/venue/<level>.webp, made by scripts/make_venue_images.py).
   Data: window.VENUE_DATA = { levels: [{ id, title: {en, zh}, img, w, h,
           zones: [{ id, pin: [x%, y%], poly: "x,y x,y …"|null }] }] }   (data/venue.js)

   On top of each image: an SVG (viewBox = image pixels) outlines the active
   areas, and HTML markers sit at pin positions in % — so the markers stay a
   readable size however small the image gets on a phone.

   Zone ids: imperial · fr-d · fr-74 · fr-81 · fr-91 · grand · grand-posters ·
             us-1 … us-25 · continental
   Franciscan rows are keyed by board range, not letter: colm.cc says
   A = #74–80, B = #81–90, C = #91–100, the poster letters them the other way.
   ========================================================================= */
window.VENUE_MAP = (function () {
  "use strict";
  var LEVELS = (window.VENUE_DATA && window.VENUE_DATA.levels) || [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; });
  }
  function txt(v, lang) { return v == null ? "" : (typeof v === "string" ? v : (v[lang] || v.en)); }

  /* ---------- room / board → zone ids ---------- */
  function zoneFor(room, board) {
    if (board != null) {
      if (board <= 73) return ["imperial"];
      if (board <= 80) return ["fr-74"];
      if (board <= 90) return ["fr-81"];
      if (board <= 100) return ["fr-91"];
      if (board <= 145) return ["grand-posters"];
    }
    var r = String(room || "").toLowerCase(), nums = r.match(/\d+/g) || [];
    if (r.indexOf("continental") === 0) return ["continental"];          // not drawn on the poster
    if (r.indexOf("union square") === 0) return nums.map(function (n) { return "us-" + n; });
    if (r.indexOf("imperial") === 0) return ["imperial"];
    if (r.indexOf("grand") === 0) return ["grand"];
    if (r.indexOf("franciscan") === 0) {
      var letters = r.replace(/^franciscan\s*/, "").split("/")[0].match(/[a-d]/g) || [];
      var byLetter = { a: "fr-74", b: "fr-81", c: "fr-91", d: "fr-d" };   // colm.cc lettering
      return letters.map(function (l) { return byLetter[l]; });
    }
    return [];
  }

  /* ---------- render ----------
     active: { zoneId: { mark: "1", state: "on" | "next", label: "Continental Ballroom 6" } }
     opts:   { lang, root (site root for the images), showAll }
     → one <figure> per level with an active zone (or every level when showAll); "" if none. */
  function render(active, opts) {
    opts = opts || {};
    var lang = opts.lang || "en", root = opts.root || "./";
    return LEVELS.filter(function (lv) {
      return opts.showAll || lv.zones.some(function (z) { return active[z.id]; });
    }).map(function (lv) {
      var on = lv.zones.filter(function (z) { return active[z.id]; });
      var polys = on.filter(function (z) { return z.poly; }).map(function (z) {
        return '<polygon class="vm__area vm__area--' + active[z.id].state + '" points="' + z.poly + '"/>';
      }).join("");
      // one marker per number per level: a group spanning adjacent rooms (Union Square 19&20) would
      // otherwise stack two identical markers; its areas are still all outlined
      var seen = {}, placed = [];
      var pins = on.filter(function (z) { var k = active[z.id].mark; if (seen[k]) return false; seen[k] = 1; return true; })
        .map(function (z) {
          var a = active[z.id];
          // markers closer than ~a marker's size (adjacent Franciscan rows) fan out sideways; the outlined
          // area still marks the exact row
          var k = placed.filter(function (p) { return Math.abs(p[0] - z.pin[0]) < 6 && Math.abs(p[1] - z.pin[1]) < 12; }).length;
          placed.push(z.pin);
          return '<span class="vm__pin vm__pin--' + a.state + '" style="left:' + z.pin[0] + '%;top:' + z.pin[1] + '%' +
            (k ? ';--fan:' + k : "") + '">' +
            '<b>' + esc(a.mark) + '</b>' + (a.label ? '<em>' + esc(a.label) + '</em>' : "") + '</span>';
        }).join("");
      var aria = txt(lv.title, lang) + (on.length ? ": " + on.map(function (z) { return active[z.id].mark; }).join(", ") : "");
      return '<figure class="vm__level"><figcaption>' + esc(txt(lv.title, lang)) + '</figcaption>' +
        '<div class="vm__scroll"><div class="vm__photo" role="img" aria-label="' + esc(aria) + '">' +
          '<img src="' + esc(root + lv.img) + '" width="' + lv.w + '" height="' + lv.h + '" alt="" loading="lazy" decoding="async">' +
          '<svg viewBox="0 0 ' + lv.w + ' ' + lv.h + '" preserveAspectRatio="none" aria-hidden="true">' + polys + '</svg>' +
          pins +
        '</div></div></figure>';
    }).join("");
  }

  return { render: render, zoneFor: zoneFor };
})();
