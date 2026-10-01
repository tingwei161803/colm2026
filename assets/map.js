/* =========================================================================
   COLM 2026 · map.js — Local Map (Leaflet map + layer panel + place list)

   Data: window.MAP_DATA = {
     venue: {name, address, lat, lng, gmaps},
     categories: [{id, label:{en,zh}, short:{en,zh}, icon}],
     places: [{id, name, cats[], price, desc:{en,zh}|null, lat, lng, gmaps}],
     zones: [{id, name, note, lat, lng, r, counts:{violent,drug,theft,night}}],
     safety: {meta, cells: [[lat, lng, violent, drug, theft, night], ...]},
     guide, resources, tips, source }

   URL state: ?cats=food,bars&heat=0&zones=0#<place-id>
     cats  — visible categories (omitted = all)     heat / zones — "0" = off
   Map tiles: OpenStreetMap standard tiles; dark mode is a CSS filter on the tile pane
   (CARTO's free basemaps now answer with an "API key required" watermark).
   ========================================================================= */
(function () {
  "use strict";
  var SH = window.SHELL, t = SH.t, esc = SH.esc, $ = SH.$, lang = SH.lang;
  var D = window.MAP_DATA || { categories: [], places: [], zones: [], safety: { cells: [] } };
  var VENUE = D.venue || { lat: 37.785734, lng: -122.410437, name: "Hilton San Francisco Union Square" };

  var UI = {
    en: { layers: "Layers", categories: "Places", all: "All", none: "None", safety: "Safety",
          heat: "Incident heat", heatSub: "SFPD reports, past 12 months", zones: "Caution zones", zonesSub: "Named spots to avoid lingering",
          fewer: "fewer", more: "more", about: "How this is made", count: "places", empty: "No place matches — turn on more categories or clear the search.",
          search: "Search places", nearVenue: "Sorted by distance from the Hilton", nearMe: "Sorted by distance from you",
          walk: function (m) { return m + " min walk"; }, km: function (k) { return k + " km"; },
          from: function (d, venue) { return d + (venue ? " from the Hilton" : " from you"); }, gmaps: "Google Maps", walkHere: "Walk here", transitHere: "Transit here",
          venue: "COLM 2026 venue", locate: "Show my location", locating: "Finding you…", denied: "Location permission was denied — enable it in your browser settings to see where you are.",
          geoFail: "Couldn't get your location right now.", noGeo: "This browser can't share its location.",
          far: "You seem to be outside San Francisco — the map stays on the venue.", you: "You are here", acc: function (m) { return "±" + m + " m"; },
          zoneCounts: "Within this circle, past 12 months", violent: "violent", drug: "drug", theft: "theft", night: "after 8 PM",
          guide: "Getting around", resources: "More to explore", tips: "Staying safe", sources: "Sources",
          srcPlaces: "Places, categories and descriptions: the official COLM 2026 “San Francisco local information” list curated by Dan Jurafsky.",
          srcSheet: "Spreadsheet", srcMyMaps: "Google My Maps",
          srcSafety: function (m) { return "Safety layer: SFPD incident reports (DataSF), " + m.from + " to " + m.to + ", " + (m.incidents || 0).toLocaleString("en") + " incidents in ~110 m cells."; },
          aboutTitle: "About the safety layer",
          aboutBody: ["The red heat counts SFPD incident reports from the past 12 months that matter to someone on foot: assaults, robberies, homicides, sex offenses and weapons offenses; drug offenses (a proxy for open-air drug scenes); and pickpocketing, purse snatching and other theft from people.",
                      "Shoplifting, car break-ins, burglary and vehicle theft are left out — they say little about walking safety and would light up the Union Square shopping district.",
                      "Read it as “where incidents get reported”, not “where you will be harmed”. Busy places have more people and more reports; drug offenses partly reflect where police patrol. Caution zones are this site's own notes, not COLM guidance."],
          dataset: "Dataset on DataSF", close: "Close", noMap: "The map library couldn't load (offline or blocked). The list below still works and every place links to Google Maps." },
    zh: { layers: "圖層", categories: "地點", all: "全選", none: "全不選", safety: "安全",
          heat: "事件熱區", heatSub: "SFPD 通報，最近 12 個月", zones: "注意區域", zonesSub: "不建議逗留的地點",
          fewer: "少", more: "多", about: "資料怎麼來的", count: "個地點", empty: "沒有符合的地點 —— 打開更多分類或清除搜尋。",
          search: "搜尋地點", nearVenue: "依離 Hilton 的距離排序", nearMe: "依離你的距離排序",
          walk: function (m) { return "步行 " + m + " 分"; }, km: function (k) { return k + " 公里"; },
          from: function (d, venue) { return (venue ? "離 Hilton " : "離你 ") + d; }, gmaps: "Google 地圖", walkHere: "步行導航", transitHere: "大眾運輸導航",
          venue: "COLM 2026 會場", locate: "顯示我的位置", locating: "定位中…", denied: "定位權限被拒絕 —— 請到瀏覽器設定開啟，才能顯示你的位置。",
          geoFail: "目前無法取得你的位置。", noGeo: "這個瀏覽器不支援定位。",
          far: "你似乎不在舊金山 —— 地圖維持顯示會場。", you: "你在這裡", acc: function (m) { return "誤差 ±" + m + " 公尺"; },
          zoneCounts: "這個圓圈內，最近 12 個月", violent: "暴力", drug: "毒品", theft: "扒竊", night: "晚上 8 點後",
          guide: "交通與周邊", resources: "更多去處", tips: "安全提醒", sources: "資料來源",
          srcPlaces: "地點、分類與描述：COLM 2026 官方「舊金山在地資訊」清單，由 Dan Jurafsky 整理；中文為本站翻譯。",
          srcSheet: "試算表", srcMyMaps: "Google My Maps",
          srcSafety: function (m) { return "安全圖層：SFPD 事件通報（DataSF），" + m.from + " 至 " + m.to + "，共 " + (m.incidents || 0).toLocaleString("en") + " 件，以約 110 公尺的格子統計。"; },
          aboutTitle: "關於安全圖層",
          aboutBody: ["紅色熱區統計最近 12 個月、跟走在路上的人有關的 SFPD 事件通報：傷害、搶劫、凶殺、性犯罪、武器相關；毒品（當作露天用藥現場的指標）；以及扒手、搶皮包與其他對人的竊盜。",
                      "店家失竊、車上財物被偷、闖空門、偷車都沒有算進來 —— 它們跟走路安全關係不大，算進來會讓 Union Square 購物區整片發紅。",
                      "請把它理解成「事件被通報的地方」，而不是「你會受害的地方」。人多的地方通報也多；毒品案件也部分反映警察巡邏的位置。注意區域是本站自己的整理，不是 COLM 官方建議。"],
          dataset: "DataSF 上的資料集", close: "關閉", noMap: "地圖程式庫載入失敗（離線或被擋）。下面的清單還能用，每個地點都能連到 Google 地圖。" }
  }[lang];

  /* Category → colour slot (site.css --cat-N). Rust (6) is skipped on purpose: red means danger here. */
  var CAT_SLOT = { food: 2, latenight: 4, cafe: 7, bars: 1, culture: 5, parks: 3, further: 8 };
  var CATS = D.categories || [];
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });
  function catColor(id) { return "var(--cat-" + (CAT_SLOT[id] || 8) + ")"; }

  /* ------------------------------------------------------------ safety weighting */
  /* How "hot" is one ~110 m cell? c = {violent, drug, theft, night}: raw incident
     counts for the past 12 months (scripts/fetch/build_safety.py). Return any
     non-negative number — the heat layer only cares about the relative size
     between cells (it is normalised against the 97th percentile below). */
  function cellWeight(c) {
    // TODO: weigh the groups — this placeholder treats every incident the same.
    return c.violent + c.drug + c.theft;
  }

  /* ------------------------------------------------------------ state + URL */
  var params = new URLSearchParams(location.search);
  var catParam = params.get("cats");
  var state = {
    cats: {},
    heat: params.get("heat") !== "0",
    zones: params.get("zones") !== "0",
    q: ""
  };
  CATS.forEach(function (c) { state.cats[c.id] = catParam == null ? true : catParam.split(",").indexOf(c.id) >= 0; });
  var selected = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
  var me = null;                       // {lat, lng, acc} once geolocation answers

  function byId(id) { for (var i = 0; i < D.places.length; i++) if (D.places[i].id === id) return D.places[i]; return null; }

  function syncUrl() {
    var p = new URLSearchParams();
    var on = CATS.filter(function (c) { return state.cats[c.id]; }).map(function (c) { return c.id; });
    if (on.length !== CATS.length) p.set("cats", on.join(","));
    if (!state.heat) p.set("heat", "0");
    if (!state.zones) p.set("zones", "0");
    var qs = p.toString();
    var url = location.pathname + (qs ? "?" + qs.replace(/%2C/g, ",") : "") + (selected ? "#" + selected : "");
    history.replaceState(null, "", url);
    var la = $("langToggle");
    if (la) la.href = la.href.split(/[?#]/)[0] + location.search + location.hash;
  }

  /* ------------------------------------------------------------ distance */
  function meters(a, b) {
    var k = 111320, dx = (b.lng - a.lng) * k * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180), dy = (b.lat - a.lat) * k;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function origin() { return me && meters(me, VENUE) < 15000 ? me : VENUE; }
  /* street grid ≈ 1.25 × straight line; 80 m per minute on foot */
  function distText(m) {
    var mins = Math.round(m * 1.25 / 80);
    return mins <= 30 ? UI.walk(Math.max(1, mins)) : UI.km((m * 1.25 / 1000).toFixed(1));
  }

  function visible(p) {
    if (!p.cats.some(function (c) { return state.cats[c]; })) return false;
    if (!state.q) return true;
    var hay = (p.name + " " + (p.desc ? p.desc.en + " " + p.desc.zh : "") + " " +
               p.cats.map(function (c) { return CAT[c] ? CAT[c].label.en + " " + CAT[c].label.zh : ""; }).join(" ")).toLowerCase();
    return hay.indexOf(state.q.toLowerCase()) >= 0;
  }

  /* ------------------------------------------------------------ links */
  function directionsUrl(p) {
    var mode = p.cats.indexOf("further") >= 0 ? "transit" : "walking";
    return "https://www.google.com/maps/dir/?api=1&destination=" + p.lat + "," + p.lng + "&travelmode=" + mode;
  }
  function linkBtn(label, url, icon, primary) {
    return '<a class="linkbtn' + (primary ? " linkbtn--primary" : "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="material-symbols-rounded" aria-hidden="true">' + icon + '</span>' + esc(label) + '</a>';
  }
  function catBadges(p, short) {
    return p.cats.map(function (c) {
      var cc = CAT[c]; if (!cc) return "";
      return '<span class="badge badge--cat" style="--cat:' + catColor(c) + '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">' + cc.icon + '</span>' + esc(short && cc.short ? t(cc.short) : t(cc.label)) + '</span>';
    }).join("");
  }

  function popupHtml(p) {
    var o = origin();
    var meta = [p.price ? '<b>' + esc(p.price) + '</b>' : "", esc(UI.from(distText(meters(o, p)), o === VENUE))]
      .filter(Boolean).join(" · ");
    var isFar = p.cats.indexOf("further") >= 0;
    return '<div class="pop">' +
      '<div class="pop__kicker">' + catBadges(p, true) + '</div>' +
      '<h3 class="pop__title">' + esc(p.name) + '</h3>' +
      '<p class="pop__meta">' + meta + '</p>' +
      (p.desc ? '<p class="pop__desc">' + esc(t(p.desc)) + '</p>' : "") +
      '<div class="pop__links">' +
        (p.gmaps ? linkBtn(UI.gmaps, p.gmaps, "map", true) : "") +
        linkBtn(isFar ? UI.transitHere : UI.walkHere, directionsUrl(p), isFar ? "directions_transit" : "directions_walk") +
      '</div></div>';
  }

  /* ------------------------------------------------------------ list */
  function paintList() {
    var o = origin();
    var list = D.places.filter(visible).map(function (p) { return { p: p, d: meters(o, p) }; })
      .sort(function (a, b) { return a.d - b.d; });
    $("countN").textContent = list.length;
    $("sortLabel").textContent = o === VENUE ? UI.nearVenue : UI.nearMe;
    $("placeList").innerHTML = list.length ? list.map(function (x) {
      var p = x.p;
      return '<li class="row row--compact" tabindex="0" role="button" data-id="' + esc(p.id) + '"' +
        ' aria-current="' + (p.id === selected ? "true" : "false") + '" style="--cat:' + catColor(p.cats[0]) + '">' +
        '<p class="row__title">' + esc(p.name) + '</p>' +
        '<div class="row__meta">' + catBadges(p, true) +
          (p.price ? '<span class="badge">' + esc(p.price) + '</span>' : "") +
          '<span>' + esc(distText(x.d)) + '</span>' +
        '</div></li>';
    }).join("") : '<li class="rows__empty">' + esc(UI.empty) + '</li>';
    [].forEach.call($("placeList").querySelectorAll(".row"), function (li) {
      li.addEventListener("click", function () { select(li.dataset.id, true); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(li.dataset.id, true); } });
    });
  }

  /* ------------------------------------------------------------ layer panel */
  function paintLayers() {
    var counts = {};
    CATS.forEach(function (c) { counts[c.id] = D.places.filter(function (p) { return p.cats.indexOf(c.id) >= 0; }).length; });
    var m = (D.safety && D.safety.meta) || {};
    $("layers").innerHTML =
      '<div class="layers__group">' +
        '<div class="layers__head"><h2>' + esc(UI.categories) + '</h2>' +
          '<span><button type="button" class="linkish" data-all="1">' + esc(UI.all) + '</button>' +
          '<button type="button" class="linkish" data-all="0">' + esc(UI.none) + '</button></span></div>' +
        '<div class="layers__chips">' + CATS.map(function (c) {
          return '<button type="button" class="chip chip--cat" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.cats[c.id] ? "true" : "false") + '"' +
            ' title="' + esc(t(c.label)) + '" style="--cat:' + catColor(c.id) + '"><span class="chip__dot" aria-hidden="true"></span>' +
            '<span class="material-symbols-rounded chip__icon" aria-hidden="true">' + c.icon + '</span>' + esc(c.short ? t(c.short) : t(c.label)) +
            ' <span class="count">' + counts[c.id] + '</span></button>';
        }).join("") + '</div>' +
      '</div>' +
      '<div class="layers__group layers__group--safety">' +
        '<div class="layers__head"><h2>' + esc(UI.safety) + '</h2>' +
          '<button type="button" class="linkish" id="aboutSafety"><span class="material-symbols-rounded" aria-hidden="true">info</span>' + esc(UI.about) + '</button></div>' +
        toggle("heatToggle", state.heat, UI.heat, UI.heatSub + (m.from ? " · " + m.from + " – " + m.to : "")) +
        '<div class="heatlegend" aria-hidden="true"><span>' + esc(UI.fewer) + '</span><i></i><span>' + esc(UI.more) + '</span></div>' +
        toggle("zoneToggle", state.zones, UI.zones, UI.zonesSub) +
      '</div>';

    [].forEach.call($("layers").querySelectorAll("[data-cat]"), function (b) {
      b.addEventListener("click", function () {
        state.cats[b.dataset.cat] = !state.cats[b.dataset.cat];
        b.setAttribute("aria-pressed", state.cats[b.dataset.cat] ? "true" : "false");
        refresh();
      });
    });
    [].forEach.call($("layers").querySelectorAll("[data-all]"), function (b) {
      b.addEventListener("click", function () {
        var v = b.dataset.all === "1";
        CATS.forEach(function (c) { state.cats[c.id] = v; });
        [].forEach.call($("layers").querySelectorAll("[data-cat]"), function (x) { x.setAttribute("aria-pressed", v ? "true" : "false"); });
        refresh();
      });
    });
    $("heatToggle").addEventListener("change", function (e) { state.heat = e.target.checked; applySafety(); syncUrl(); });
    $("zoneToggle").addEventListener("change", function (e) { state.zones = e.target.checked; applySafety(); syncUrl(); });
    $("aboutSafety").addEventListener("click", openAbout);
  }
  function toggle(id, on, label, sub) {
    return '<label class="switch" for="' + id + '">' +
      '<input type="checkbox" role="switch" id="' + id + '"' + (on ? " checked" : "") + '>' +
      '<span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>' +
      '<span class="switch__text"><b>' + esc(label) + '</b><small>' + esc(sub) + '</small></span></label>';
  }

  function openAbout() {
    var m = (D.safety && D.safety.meta) || {};
    var tips = (D.tips && (D.tips[lang] || D.tips.en)) || [];
    SH.openDialog('<article class="detail"><h2 class="detail__title">' + esc(UI.aboutTitle) + '</h2>' +
      UI.aboutBody.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join("") +
      (m.from ? '<p class="note">' + esc(UI.srcSafety(m)) + '</p>' : "") +
      '<h3>' + esc(UI.tips) + '</h3><ul>' + tips.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>' +
      (m.url ? '<div class="detail__links">' + linkBtn(UI.dataset, m.url, "open_in_new") + '</div>' : "") +
      '</article>');
  }

  /* ------------------------------------------------------------ guide (below the map) */
  function paintGuide() {
    var src = D.source || {}, m = (D.safety && D.safety.meta) || {};
    var tips = (D.tips && (D.tips[lang] || D.tips.en)) || [];
    $("guide").innerHTML =
      '<h2 class="mapguide__title">' + esc(UI.guide) + '</h2>' +
      '<div class="mapguide__grid">' + (D.guide || []).map(function (g) {
        return '<div class="mapguide__card"><span class="material-symbols-rounded" aria-hidden="true">' + esc(g.icon) + '</span>' +
          '<h3>' + esc(t(g.title)) + '</h3><p>' + esc(t(g.text)) + '</p></div>';
      }).join("") +
      '<div class="mapguide__card mapguide__card--safety"><span class="material-symbols-rounded" aria-hidden="true">health_and_safety</span>' +
        '<h3>' + esc(UI.tips) + '</h3><ul>' + tips.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul></div>' +
      '</div>' +
      '<h2 class="mapguide__title">' + esc(UI.resources) + '</h2>' +
      '<ul class="mapguide__links">' + (D.resources || []).map(function (r) {
        return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r[lang] || r.en) +
          '<span class="material-symbols-rounded" aria-hidden="true">open_in_new</span></a></li>';
      }).join("") + '</ul>' +
      '<p class="note mapguide__src"><b>' + esc(UI.sources) + '.</b> ' + esc(UI.srcPlaces) + ' ' +
        (src.sheet ? '<a href="' + esc(src.sheet) + '" target="_blank" rel="noopener">' + esc(UI.srcSheet) + '</a> · ' : "") +
        (src.mymaps ? '<a href="' + esc(src.mymaps) + '" target="_blank" rel="noopener">' + esc(UI.srcMyMaps) + '</a>' : "") +
        (m.from ? '<br>' + esc(UI.srcSafety(m)) + (m.url ? ' <a href="' + esc(m.url) + '" target="_blank" rel="noopener">DataSF</a>' : "") : "") +
      '</p>';
  }

  /* ------------------------------------------------------------ map */
  var map = null, markers = {}, placeLayer = null, heatLayer = null, zoneLayer = null;
  var meLayer = null, meDot = null, meRing = null, watchId = null, locBtn = null;

  var TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
             ' · <a href="https://data.sfgov.org/">DataSF</a>';

  function pinIcon(p) {
    var c = p.cats[0];
    return window.L.divIcon({
      className: "pin-wrap",
      html: '<span class="pin" style="--cat:' + catColor(c) + '"><span class="material-symbols-rounded" aria-hidden="true">' +
            (CAT[c] ? CAT[c].icon : "place") + '</span></span>',
      iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14]
    });
  }

  /* heat radius follows the zoom so one data cell (~110 m) always paints about the same ground area */
  function heatRadius() {
    var mpp = 156543.03 * Math.cos(VENUE.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
    return Math.max(6, Math.min(70, 1.05 * 110 / mpp));
  }
  function buildHeat() {
    if (!window.L.heatLayer) return null;
    var pts = (D.safety.cells || []).map(function (c) {
      return [c[0], c[1], cellWeight({ violent: c[2], drug: c[3], theft: c[4], night: c[5] })];
    }).filter(function (p) { return p[2] > 0; });
    var ws = pts.map(function (p) { return p[2]; }).sort(function (a, b) { return a - b; });
    var cap = ws.length ? ws[Math.floor(ws.length * 0.97)] || ws[ws.length - 1] : 1;
    var r = heatRadius();
    return window.L.heatLayer(pts, {
      radius: r, blur: r * 0.9, max: cap, maxZoom: 0, minOpacity: 0,
      gradient: { 0.2: "#fee0d2", 0.4: "#fcae91", 0.6: "#fb6a4a", 0.8: "#de2d26", 1: "#a50f15" }
    });
  }
  function buildZones() {
    var g = window.L.layerGroup();
    (D.zones || []).forEach(function (z) {
      var c = z.counts || {};
      var html = '<div class="pop pop--zone"><div class="pop__kicker"><span class="badge badge--danger">' +
        '<span class="material-symbols-rounded" aria-hidden="true">warning</span>' + esc(UI.zones) + '</span></div>' +
        '<h3 class="pop__title">' + esc(t(z.name)) + '</h3><p class="pop__desc">' + esc(t(z.note)) + '</p>' +
        '<p class="pop__meta">' + esc(UI.zoneCounts) + ': <b>' + c.violent + '</b> ' + esc(UI.violent) + ' · <b>' + c.drug + '</b> ' + esc(UI.drug) +
        ' · <b>' + c.theft + '</b> ' + esc(UI.theft) + ' (' + c.night + ' ' + esc(UI.night) + ')</p></div>';
      window.L.circle([z.lat, z.lng], {
        radius: z.r, color: "#c62828", weight: 2, dashArray: "6 5", fillColor: "#e53935", fillOpacity: 0.07, className: "zone"
      }).bindPopup(html, { maxWidth: 320 })
        .bindTooltip(esc(t(z.name)), { permanent: true, direction: "center", className: "zone-label", pane: "zoneLabels" })
        .addTo(g);
    });
    return g;
  }
  function applySafety() {
    if (!map) return;
    if (heatLayer) { if (state.heat) heatLayer.addTo(map); else map.removeLayer(heatLayer); }
    if (zoneLayer) { if (state.zones) zoneLayer.addTo(map); else map.removeLayer(zoneLayer); }
  }

  function applyMarkers() {
    if (!map) return;
    D.places.forEach(function (p) {
      var m = markers[p.id];
      if (visible(p)) { if (!placeLayer.hasLayer(m)) placeLayer.addLayer(m); }
      else if (placeLayer.hasLayer(m)) placeLayer.removeLayer(m);
    });
  }

  /* ------------------------------------------------------------ my location */
  function toast(msg) {
    var el = $("mapToast");
    if (!el) return;
    el.textContent = msg;
    el.setAttribute("data-show", "true");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.setAttribute("data-show", "false"); }, 4200);
  }
  function locate() {
    if (!navigator.geolocation) { toast(UI.noGeo); return; }
    if (me) { map.flyTo([me.lat, me.lng], Math.max(map.getZoom(), 16)); return; }
    if (watchId != null) return;
    locBtn.setAttribute("data-state", "busy");
    toast(UI.locating);
    watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  }
  function onPos(pos) {
    var first = !me;
    var prev = me;
    me = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy || 0) };
    locBtn.setAttribute("data-state", "on");
    if (!meLayer) {
      meRing = window.L.circle([me.lat, me.lng], { radius: me.acc, className: "me-ring", weight: 1, interactive: false });
      meDot = window.L.marker([me.lat, me.lng], {
        icon: window.L.divIcon({ className: "pin-wrap", html: '<span class="me-dot"></span>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        zIndexOffset: 6000, keyboard: false
      });
      meLayer = window.L.layerGroup([meRing, meDot]).addTo(map);
    } else {
      meRing.setLatLng([me.lat, me.lng]).setRadius(me.acc);
      meDot.setLatLng([me.lat, me.lng]);
    }
    meDot.bindTooltip(esc(UI.you) + " · " + esc(UI.acc(me.acc)));
    if (first) {
      if (meters(me, VENUE) < 15000) map.flyTo([me.lat, me.lng], Math.max(map.getZoom(), 16));
      else toast(UI.far);
    }
    /* re-sort the list only when you have actually moved (GPS jitters by a few metres) */
    if (first || meters(prev, me) > 30) paintList();
  }
  function onPosErr(err) {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    locBtn.setAttribute("data-state", me ? "on" : "off");
    toast(err && err.code === 1 ? UI.denied : UI.geoFail);
  }

  function initMap() {
    var L = window.L;
    map = L.map("map", { zoomControl: false, scrollWheelZoom: true, tap: true }).setView([VENUE.lat, VENUE.lng], 14);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);

    /* locate-me button (Leaflet control so it sits with the zoom buttons) */
    var Locate = L.Control.extend({
      options: { position: "topright" },
      onAdd: function () {
        var b = L.DomUtil.create("button", "map-btn");
        b.type = "button";
        b.title = UI.locate;
        b.setAttribute("aria-label", UI.locate);
        b.setAttribute("data-state", "off");
        b.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">my_location</span>';
        L.DomEvent.disableClickPropagation(b);
        L.DomEvent.on(b, "click", locate);
        locBtn = b;
        return b;
      }
    });
    new Locate().addTo(map);

    var toastEl = document.createElement("div");
    toastEl.className = "maptoast"; toastEl.id = "mapToast";
    toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
    $("mapBox").appendChild(toastEl);

    /* zone names sit under the pins (markerPane = 600); Leaflet's default tooltipPane (650)
       would cover the venue star's label, which is right next to the Tenderloin zone */
    map.createPane("zoneLabels").style.zIndex = 550;
    heatLayer = buildHeat();
    zoneLayer = buildZones();
    applySafety();
    map.on("zoomend", function () {
      if (heatLayer) { var r = heatRadius(); heatLayer.setOptions({ radius: r, blur: r * 0.9 }); }
      $("map").setAttribute("data-zoom", map.getZoom());
    });
    $("map").setAttribute("data-zoom", map.getZoom());

    placeLayer = L.layerGroup().addTo(map);
    D.places.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(p), title: p.name, riseOnHover: true });
      m.bindPopup(function () { return popupHtml(p); }, { maxWidth: 300, autoPanPaddingTopLeft: [10, 60] });
      m.on("click", function () { select(p.id, false); });
      m.on("popupclose", function () { if (selected === p.id) { selected = null; markRows(); syncUrl(); } });
      markers[p.id] = m;
    });
    applyMarkers();

    L.marker([VENUE.lat, VENUE.lng], {
      /* a real star shape (inline SVG), not an icon in a circle: the site loads Material Symbols
         with FILL 0 only, so a "filled" star glyph would render as a thin outline */
      icon: L.divIcon({ className: "pin-wrap", html: '<span class="venue-star">' +
                          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>' +
                          '<span class="venue-star__label">COLM 2026</span></span>',
                        iconSize: [46, 46], iconAnchor: [23, 24], popupAnchor: [0, -20] }),
      zIndexOffset: 5000, title: VENUE.name
    }).bindPopup('<div class="pop"><div class="pop__kicker"><span class="badge">' + esc(UI.venue) + '</span></div>' +
      '<h3 class="pop__title">' + esc(VENUE.name) + '</h3><p class="pop__meta">' + esc(VENUE.address || "") + '</p>' +
      '<div class="pop__links">' + (VENUE.gmaps ? linkBtn(UI.gmaps, VENUE.gmaps, "map", true) : "") + '</div></div>').addTo(map);
  }

  /* ------------------------------------------------------------ selection */
  function markRows() {
    [].forEach.call($("placeList").querySelectorAll(".row"), function (li) {
      li.setAttribute("aria-current", li.dataset.id === selected ? "true" : "false");
    });
  }
  function select(id, fromList) {
    var p = byId(id);
    if (!p) return;
    selected = id;
    if (!visible(p)) {                     // deep link / list click into a hidden category: switch it on
      state.cats[p.cats[0]] = true;
      var chip = $("layers").querySelector('[data-cat="' + p.cats[0] + '"]');
      if (chip) chip.setAttribute("aria-pressed", "true");
      applyMarkers(); paintList();
    }
    markRows();
    syncUrl();
    if (map && fromList) {
      if (SH.isNarrow()) $("mapBox").scrollIntoView({ behavior: "smooth", block: "start" });
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
      map.once("moveend", function () { markers[p.id].openPopup(); });
    }
    if (!SH.isNarrow()) {
      var row = $("placeList").querySelector('[data-id="' + id + '"]');
      if (row && !fromList) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function refresh() { applyMarkers(); paintList(); syncUrl(); }

  /* ------------------------------------------------------------ boot */
  $("q").placeholder = UI.search;
  $("q").addEventListener("input", function (e) { state.q = e.target.value.trim(); refresh(); });
  $("countLabel").textContent = UI.count;
  paintLayers();
  paintList();
  paintGuide();
  if (window.L) {
    initMap();
    if (selected && byId(selected)) select(selected, true);
  } else {
    $("map").innerHTML = '<p class="map__fallback">' + esc(UI.noMap) + '</p>';
  }
})();
