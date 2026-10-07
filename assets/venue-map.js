/* =========================================================================
   COLM 2026 · venue-map.js — schematic floor plans of Hilton Union Square

   Redrawn (simplified, not to scale) from the venue's floor-plan poster:
   Level 4 (Union Square rooms 1–25), the Grand Ballroom level, and the
   Ballroom level (Imperial, Franciscan, Continental). The Continental rooms
   are not drawn on the poster ("Friday workshops — Continental rooms"), so
   they appear as a labelled annex.

   Zones carry ids so a paper can be highlighted from its room + board number:
     imperial · fr-d · fr-74 · fr-81 · fr-91 · grand · grand-posters
     cont-1 … cont-9 · us-1 … us-25

   Franciscan rows are keyed by board range, not letter: colm.cc says
   A = #74–80, B = #81–90, C = #91–100, while the poster letters them the other
   way round. The board number is what both agree on.
   ========================================================================= */
window.VENUE_MAP = (function () {
  "use strict";
  var W = 400;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; });
  }

  /* ---------- level geometry (viewBox units) ---------- */
  function cells(prefix, from, to, x, y, w, h, dir) {
    // dir: "right" | "left" | "down" | "up" — direction in which room numbers increase
    var out = [], n = to - from + 1;
    for (var i = 0; i < n; i++) {
      var k = from + i, cx = x, cy = y, cw = w, ch = h;
      if (dir === "right" || dir === "left") { cw = w / n; cx = dir === "right" ? x + i * cw : x + w - (i + 1) * cw; }
      else { ch = h / n; cy = dir === "down" ? y + i * ch : y + h - (i + 1) * ch; }
      out.push({ id: prefix + k, x: cx, y: cy, w: cw, h: ch, label: String(k), small: true });
    }
    return out;
  }

  function grid(prefix, n, cols, x, y, w, h) {
    // rooms 1..n in a cols-wide grid, numbered left→right, top→bottom (Continental annex)
    var out = [], rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows;
    for (var k = 0; k < n; k++) {
      out.push({ id: prefix + (k + 1), x: x + (k % cols) * cw + 1, y: y + Math.floor(k / cols) * ch + 1,
                 w: cw - 2, h: ch - 2, label: String(k + 1), small: true });
    }
    return out;
  }

  var LEVELS = [
    {
      id: "level4", h: 200,
      title: { en: "Level 4 · Union Square rooms", zh: "四樓 · Union Square 會議室" },
      decor: [{ x: 92, y: 42, w: 240, h: 116, label: "Union Square", sub: { en: "meeting rooms", zh: "會議室" } }],
      zones: [].concat(
        cells("us-", 21, 25, 92, 14, 240, 26, "right"),
        cells("us-", 1, 7, 334, 14, 50, 172, "down"),
        cells("us-", 8, 13, 92, 160, 240, 26, "left"),
        cells("us-", 14, 20, 40, 14, 50, 172, "up")
      )
    },
    {
      id: "grand", h: 170,
      title: { en: "Grand Ballroom level", zh: "Grand Ballroom 樓層" },
      decor: [
        { x: 70, y: 18, w: 200, h: 16, label: { en: "Stage", zh: "舞台" }, small: true },
        { x: 312, y: 112, w: 80, h: 48, label: { en: "Child care", zh: "托兒室" }, small: true }
      ],
      zones: [
        { id: "grand", x: 40, y: 10, w: 260, h: 108, label: "Grand Ballroom", sub: { en: "talks · orals", zh: "演講 · 口頭報告" } },
        { id: "grand-posters", x: 40, y: 120, w: 260, h: 40, label: { en: "Posters #101–145", zh: "海報 #101–145" } }
      ]
    },
    {
      id: "ballroom", h: 250,
      title: { en: "Ballroom level", zh: "Ballroom 樓層" },
      decor: [
        { x: 120, y: 12, w: 46, h: 54, label: "West", sub: "Lounge", small: true },
        { x: 120, y: 112, w: 272, h: 18, label: "Yosemite Foyer", small: true },
        { x: 120, y: 138, w: 40, h: 104, label: "Yosemite", small: true, vertical: true },
        { x: 182, y: 150, w: 168, h: 54, label: { en: "Exhibitors", zh: "攤位展示" }, sub: { en: "Oct 6–8", zh: "10/6–10/8" } },
        { x: 8, y: 12, w: 100, h: 18, label: "Continental", small: true, bare: true }
      ],
      zones: [].concat(
        [
          { id: "imperial", x: 172, y: 12, w: 112, h: 92, label: "Imperial", sub: { en: "posters #1–73", zh: "海報 #1–73" } },
          { id: "fr-d", x: 292, y: 12, w: 100, h: 20, label: "Socials", small: true },
          { id: "fr-74", x: 292, y: 34, w: 100, h: 22, label: "#74–80", small: true },
          { id: "fr-81", x: 292, y: 58, w: 100, h: 22, label: "#81–90", small: true },
          { id: "fr-91", x: 292, y: 82, w: 100, h: 22, label: "#91–100", small: true }
        ],
        grid("cont-", 9, 3, 8, 34, 100, 208)
      )
    }
  ];

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
    if (r.indexOf("continental") === 0) return nums.map(function (n) { return "cont-" + n; });
    if (r.indexOf("union square") === 0) return nums.map(function (n) { return "us-" + n; });
    if (r.indexOf("imperial") === 0) return ["imperial"];
    if (r.indexOf("grand") === 0) return ["grand"];
    if (r.indexOf("franciscan") === 0) {
      var letters = (r.replace(/^franciscan\s*/, "").split("/")[0].match(/[a-d]/g) || []);
      var byLetter = { a: "fr-74", b: "fr-81", c: "fr-91", d: "fr-d" };   // colm.cc lettering
      return letters.map(function (l) { return byLetter[l]; });
    }
    return [];
  }

  /* ---------- render ---------- */
  function txt(v, lang) { return v == null ? "" : (typeof v === "string" ? v : (v[lang] || v.en)); }

  function box(z, lang, cls, mark) {
    var label = txt(z.label, lang), sub = txt(z.sub, lang);
    var cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    var fs = z.small ? 10 : 13, out = "";
    if (!z.bare) out += '<rect class="' + cls + '" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="4"/>';
    if (label) {
      var ty = sub ? cy - 3 : cy + fs * 0.35;
      if (z.bare) ty = z.y + z.h - 4;
      out += '<text class="vm__t' + (z.small ? " vm__t--s" : "") + '" x="' + cx + '" y="' + ty + '"' +
        (z.vertical ? ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' : "") + ' font-size="' + fs + '">' + esc(label) + '</text>';
      if (sub) out += '<text class="vm__t vm__t--sub" x="' + cx + '" y="' + (cy + 11) + '" font-size="10">' + esc(sub) + '</text>';
    }
    if (mark) {
      var r = 10, mx = z.x + z.w - (z.w < 40 ? z.w / 2 : r + 3), my = z.y + (z.h < 30 ? z.h / 2 : r + 3);
      out += '<g class="vm__mk"><circle cx="' + mx + '" cy="' + my + '" r="' + r + '"/>' +
             '<text x="' + mx + '" y="' + (my + 4) + '" font-size="11">' + esc(mark) + '</text></g>';
    }
    return out;
  }

  /* active: { zoneId: { mark: "1", state: "on" | "next" } } → one <figure> per level that has an
     active zone (or every level when opts.showAll). Returns "" when nothing is drawn. */
  function render(active, opts) {
    opts = opts || {};
    var lang = opts.lang || "en";
    return LEVELS.filter(function (lv) {
      return opts.showAll || lv.zones.some(function (z) { return active[z.id]; });
    }).map(function (lv) {
      var on = lv.zones.filter(function (z) { return active[z.id]; });
      var aria = txt(lv.title, lang) + (on.length ? ": " + on.map(function (z) { return txt(z.label, lang); }).join(", ") : "");
      var marks = [];
      var body = lv.decor.map(function (d) { return box(d, lang, "vm__decor"); }).join("") +
        lv.zones.map(function (z) {
          var a = active[z.id];
          if (a) { marks.push([z, a]); return ""; }
          return box(z, lang, "vm__zone");
        }).join("") +
        // active zones last so their outline and marker sit on top
        marks.map(function (p) { return box(p[0], lang, "vm__zone vm__zone--" + p[1].state, p[1].mark); }).join("");
      return '<figure class="vm__level"><figcaption>' + esc(txt(lv.title, lang)) + '</figcaption>' +
        '<svg viewBox="0 0 ' + W + ' ' + lv.h + '" role="img" aria-label="' + esc(aria) + '">' + body + '</svg></figure>';
    }).join("");
  }

  return { render: render, zoneFor: zoneFor };
})();
