// Grafiken der versteckten Seite. Braucht die globalen Bibliotheken Plot (Observable Plot), d3 und L (Leaflet)
// sowie window.CINCLUS_DATA, das analysis/R/04_build_page.R vor diesem Skript einsetzt.
(function () {
  var D = window.CINCLUS_DATA;
  var root = document.querySelector(".cinclus");
  if (!D || !root) return;

  var css = getComputedStyle(root);
  var tok = function (n) { return css.getPropertyValue(n).trim(); };

  // Farbe folgt dem Gewässer, überall gleich
  // Rom und Ova dal Fuorn teilen sich die Farbe «Vergleichsgewässer» (beide unbelastet).
  var RIVERS = ["Oberer Spöl", "Unterer Spöl", "Rom", "Ova dal Fuorn"];
  var KEYS = ["Oberer Spöl", "Unterer Spöl", "Vergleichsgewässer"];
  var KEY_COLORS = [tok("--series-1"), tok("--series-2"), tok("--series-3")];
  var key = function (d) { return d.river === "SP" || d.river === "US" ? d.river_label : "Vergleichsgewässer"; };
  var colorOf = function (d) { return KEY_COLORS[KEYS.indexOf(key(d))] || tok("--text-muted"); };
  var riverColor = { legend: true, domain: KEYS, range: KEY_COLORS };
  // Beringt wurde nur am Spöl und an der Ova dal Fuorn: dort die Gewässer direkt beschriften.
  var RING_RIVERS = ["Oberer Spöl", "Unterer Spöl", "Ova dal Fuorn"];
  var ringColor = { legend: true, domain: RING_RIVERS, range: KEY_COLORS };
  var AGE = ["Adult", "Diesjährig", "Nestling", "Unbekannt"];
  var AGE_SYMBOLS = ["circle", "triangle", "square", "diamond"];

  var fmt = d3.format(",.0f");
  var fmtDe = function (v) { return fmt(v).replace(/,/g, "'"); };
  var fmtV = function (v) { return v < 10 ? d3.format(".2~f")(v) : fmtDe(v); };   // Messwerte, auch < 1
  var dateDe = function (s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : ""; };
  var width = function (el) { return Math.max(300, (el.clientWidth || 640) - 16); };
  var $ = function (id) { return document.getElementById(id); };

  root.querySelectorAll("[data-bind=generated]").forEach(function (el) { el.textContent = dateDe(D.generated); });

  var common = {
    style: { fontSize: "13px", color: tok("--text-primary"), background: "transparent" },
    marginLeft: 120
  };
  var xLog = { type: "log", grid: true, tickFormat: fmtV };
  var tipPcb = {
    channels: { Probe: "label", Datum: function (d) { return dateDe(d.date); }, Gewässer: "river_label" },
    format: { x: function (v) { return fmtV(v) + " ng/g"; }, y: false, stroke: false, fill: false }
  };

  function tiles(el, items) {
    el.innerHTML = items.map(function (t) {
      var key = t.color ? '<span class="k" style="background:' + t.color + '"></span>' : "";
      return '<div class="cinclus-tile"><div class="v">' + t.value + '</div><div class="l">' + key + t.label + "</div></div>";
    }).join("");
  }

  function table(el, rows, cols) {
    var h = "<table><thead><tr>" + cols.map(function (c) { return "<th>" + c[0] + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr>" + cols.map(function (c) {
        var v = c[1](r);
        return "<td" + (typeof v === "number" ? ' class="num"' : "") + ">" + (typeof v === "number" ? fmtDe(v) : (v == null ? "" : v)) + "</td>";
      }).join("") + "</tr>";
    });
    el.innerHTML = h + "</tbody></table>";
  }

  // ---------- PCB: Wasseramsel-Eier ----------
  var samples = D.pcb.samples;
  var eggs = samples.filter(function (d) { return d.group === "Wasseramsel-Eier"; });

  tiles($("egg-tiles"), D.pcb.egg_summary.map(function (s) {
    return {
      value: fmtDe(s.median_factor) + "×",
      label: s.river_label + ": Median über Höchstwert Hühnerei (n = " + s.n + ")",
      color: colorOf(s)
    };
  }));

  var yearSel = $("egg-year");
  var years = Array.from(new Set(eggs.map(function (d) { return d.year; }))).sort();
  yearSel.innerHTML = '<option value="">alle</option>' + years.map(function (y) { return "<option>" + y + "</option>"; }).join("");

  // Spöl-Eier entlang des Flusses (km ab Punt dal Gall), Rom als eigener Abschnitt rechts.
  // Mehrere Eier aus demselben Nest liegen auf derselben Distanz und werden leicht nebeneinander gesetzt.
  function spread(data, step) {
    var seen = {};
    data.forEach(function (d) { (seen[d.km] = seen[d.km] || []).push(d); });
    return data.map(function (d) {
      var g = seen[d.km], i = g.indexOf(d);
      return Object.assign({ xk: d.km + (i - (g.length - 1) / 2) * step }, d);
    });
  }

  // Zwei Kenngrössen, je eigene Grafiken: Summe 6 Indikator-PCB und Summe 12 dioxinähnliche PCB
  var IPCB = { field: "value", label: "Summe 6 iPCB (ng/g Fett)", limit: true };
  var DLPCB = { field: "dl", label: "Summe 12 dl-PCB (ng/g Fett)", limit: false };
  var has = function (metric) { return function (d) { return d[metric.field] > 0; }; };
  function logDomain(rows, metric) {
    var e = d3.extent(rows.filter(has(metric)), function (d) { return d[metric.field]; });
    var lo = Math.pow(10, Math.floor(Math.log10(e[0]))), hi = Math.pow(10, Math.ceil(Math.log10(e[1])));
    return metric.limit ? [Math.min(lo, 20), hi] : [lo, hi];
  }

  function drawEggs(el, metric) {
    var y = yearSel.value;
    var data = eggs.filter(function (d) { return (!y || String(d.year) === y) && has(metric)(d); });
    var spoel = spread(data.filter(function (d) { return d.river !== "RO" && d.km != null; }), 0.09);
    var rom = data.filter(function (d) { return d.river === "RO"; }).map(function (d, i, a) {
      return Object.assign({ xr: (i - (a.length - 1) / 2) * 0.35 }, d);
    });
    var yScale = { type: "log", domain: logDomain(eggs, metric), label: "↑ " + metric.label, grid: true, tickFormat: fmtV };
    var limitRule = metric.limit ? Plot.ruleY([D.pcb.limit], { stroke: tok("--text-muted"), strokeDasharray: "4,3" }) : null;
    var dot = function (rows, x) {
      return Plot.dot(rows, Object.assign({
        x: x, y: metric.field, fill: key, r: 5, stroke: tok("--surface-1"), strokeWidth: 1.5,
        channels: Object.assign({ km: "km" }, tipPcb.channels),
        tip: { format: { x: false, y: function (v) { return fmtV(v) + " ng/g"; }, fill: false, km: function (v) { return v == null ? "" : v + " km"; } } }
      }));
    };
    var total = width(el), romW = total < 500 ? 80 : 130, mainW = Math.max(200, total - romW - 8);
    var main = Plot.plot(Object.assign({}, common, {
      width: mainW, height: 320, marginLeft: 60, marginTop: 28, marginBottom: 40,
      x: { domain: [0, 13.5], label: "km ab Punt dal Gall (Staumauer) →", grid: true },
      y: yScale,
      color: { domain: KEYS, range: KEY_COLORS },
      marks: [
        limitRule,
        metric.limit ? Plot.text(["Hühnerei-Höchstwert"], { x: 13.5, y: D.pcb.limit, dy: -8, textAnchor: "end", fill: tok("--text-secondary"), fontSize: 11 }) : null,
        Plot.text([{ x: 3, t: "Oberer Spöl" }, { x: 11, t: "Unterer Spöl" }], { x: "x", text: "t", frameAnchor: "top", dy: 10, fill: tok("--text-secondary"), fontWeight: 600 }),
        dot(spoel, "xk")
      ]
    }));
    var side = Plot.plot(Object.assign({}, common, {
      width: romW, height: 320, marginLeft: 10, marginRight: 10, marginTop: 28, marginBottom: 40,
      x: { domain: [-1, 1], axis: null },
      y: Object.assign({}, yScale, { axis: null }),
      color: { domain: KEYS, range: KEY_COLORS },
      marks: [
        limitRule,
        Plot.text(["Rom"], { frameAnchor: "top", dy: 10, fill: tok("--text-secondary"), fontWeight: 600 }),
        Plot.frame({ anchor: "left", stroke: tok("--grid") }),
        dot(rom, "xr")
      ]
    }));
    var row = document.createElement("div");
    row.className = "cinclus-row";
    row.append(main, side);
    el.replaceChildren(Plot.legend({ color: riverColor }), row);
  }
  function drawEggCharts() { drawEggs($("chart-eggs"), IPCB); drawEggs($("chart-eggs-dl"), DLPCB); }
  yearSel.addEventListener("change", drawEggCharts);

  // ---------- PCB: Nahrungskette ----------
  var GROUPS = ["Makrozoobenthos", "Ufer-Spinnen", "Fischlaich", "Fische", "Wasseramsel-Eier"];

  function drawChain(el, metric) {
    var data = samples.filter(has(metric));
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: width(el), height: 320,
      x: Object.assign({}, xLog, { domain: logDomain(samples, metric), label: metric.label + " →" }),
      y: { domain: GROUPS.slice().reverse(), label: null },
      color: riverColor,
      marks: [
        metric.limit ? Plot.ruleX([D.pcb.limit], { stroke: tok("--text-muted"), strokeDasharray: "4,3" }) : null,
        Plot.dot(data, {
          x: metric.field, y: "group",
          stroke: key, r: 5, strokeWidth: 2, fill: key,
          fillOpacity: function (d) { return d.unit_uncertain ? 0 : 0.85; }
        }),
        Plot.tip(data, Plot.pointer(Object.assign({ x: metric.field, y: "group" }, tipPcb)))
      ]
    })));
  }

  table($("table-pcb"), samples, [
    ["Gruppe", function (d) { return d.group; }],
    ["Art", function (d) { return d.taxon; }],
    ["Probe", function (d) { return d.label; }],
    ["Gewässer", function (d) { return d.river_label; }],
    ["Datum", function (d) { return dateDe(d.date); }],
    ["Σ 6 iPCB (ng/g Fett)", function (d) { return d.value; }],
    ["Σ 12 dl-PCB (ng/g Fett)", function (d) { return d.dl == null ? "" : d.dl < 10 ? d.dl.toFixed(2) : d.dl; }],
    ["× Hühnerei", function (d) { return d.factor; }],
    ["Hinweis", function (d) { return [d.unit_uncertain ? "Einheit unsicher" : "", d.poor_recovery ? "schlechte Wiederfindung" : ""].filter(Boolean).join(", "); }]
  ]);

  // ---------- Beringungen ----------
  var birds = D.ringing.birds;
  var count = function (f) { return birds.filter(f).length; };
  tiles($("ring-tiles"), [
    { value: birds.length, label: "Wasseramseln beringt" },
    { value: count(function (d) { return d.river === "SP"; }), label: "Oberer Spöl", color: KEY_COLORS[0] },
    { value: count(function (d) { return d.river === "US"; }), label: "Unterer Spöl", color: KEY_COLORS[1] },
    { value: count(function (d) { return d.river === "OF"; }), label: "Ova dal Fuorn", color: KEY_COLORS[2] },
    { value: count(function (d) { return d.age_class === "Nestling"; }), label: "davon als Nestling" }
  ]);

  // Karte mit einem Kreis pro Ort; Grösse = Anzahl Einträge, Klick listet sie auf.
  function pointMap(el, rows, title, line) {
    var map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
      { maxZoom: 18, attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>' }).addTo(map);
    var places = d3.groups(rows.filter(function (d) { return d.lat != null; }),
      function (d) { return d.lat + "," + d.lon; });
    var layer = L.featureGroup().addTo(map);
    places.forEach(function (p) {
      var list = p[1], first = list[0];
      L.circleMarker([first.lat, first.lon], {
        radius: 4 + 2.5 * Math.sqrt(list.length), color: "#fff", weight: 2, fillColor: colorOf(first), fillOpacity: 0.85
      }).bindPopup("<b>" + title(first) + "</b><br>" + list.map(line).join(""), { maxWidth: 320 }).addTo(layer);
    });
    map.fitBounds(layer.getBounds().pad(0.1));
    return { map: map, places: places, bounds: layer.getBounds() };
  }

  // ---------- Farbringe ----------
  // Kürzel aus ref.rings; Farben wie im Ring-Finder (assets/finder.js)
  var RING_COLORS = {
    alu: "#808080", whi: "#eee", red: "#e22c22", yel: "#d6a51c", gre: "#227722", blu: "#4b77b8",
    vio: "#6e009e", ros: "#f58ac7", pin: "#e6007e", bro: "#a0672d", bla: "#222", bln: "#222"
  };
  function pill(code) {
    if (!code || !RING_COLORS[code]) return '<span class="pill" style="background:#f1f1f1;color:#999">–</span>';
    var text = code === "whi" || code === "ros" ? "#000" : "#fff";
    return '<span class="pill" style="background:' + RING_COLORS[code] + ";color:" + text + '">' + code + "</span>";
  }
  // Reihenfolge in `rings`: links oben | links unten | rechts oben | rechts unten (aus Sicht des Vogels)
  function ringGrid(b) {
    var r = (b.rings || "|||").split("|");
    return '<span class="rings">' + pill(r[0]) + pill(r[2]) + pill(r[1]) + pill(r[3]) + "</span>";
  }
  function birdCard(b, details) {
    return '<div class="cinclus-bird"><b>' + b.name + "</b>" +
      (details ? ' <span class="d">' + dateDe(b.date) + " · " + b.age_class + "</span>" : "") + ringGrid(b) + "</div>";
  }

  // Alle Ringkombinationen: auf breiten Bildschirmen als Kästchen in zwei Spalten links und rechts der Karte,
  // je mit einer Linie zum Ort (so überdecken sie sich nicht); auf schmalen Bildschirmen als Liste unter der Karte.
  function ringLabels(m, listEl) {
    var map = m.map, el = map.getContainer();
    var pane = L.DomUtil.create("div", "cinclus-labels", el);
    var svg = d3.select(pane).append("svg");
    var places = m.places.map(function (p) { return { birds: p[1], lat: p[1][0].lat, lon: p[1][0].lon, place: p[1][0].place }; });
    var boxes = places.map(function (p) {
      var box = L.DomUtil.create("div", "cinclus-label", pane);
      box.innerHTML = p.birds.map(function (b) { return birdCard(b, false); }).join("");
      return Object.assign({ el: box }, p);
    });
    listEl.innerHTML = places.slice().sort(function (a, b) { return a.birds[0].river < b.birds[0].river ? -1 : a.place < b.place ? -1 : 1; })
      .map(function (p) {
        return '<div class="cinclus-ringlist-place"><h4>' + (p.place || "") + '</h4><div class="cinclus-ringlist-birds">' +
          p.birds.map(function (b) { return birdCard(b, false); }).join("") + "</div></div>";
      }).join("");

    var on = false, colW = 0, normalH = el.style.height;
    var wide = function () { return el.clientWidth >= 640; };

    function layout() {
      if (!on || !wide()) return;
      var size = map.getSize(), gap = 4;
      boxes.forEach(function (b) {
        var pt = map.latLngToContainerPoint([b.lat, b.lon]);
        b.ax = pt.x; b.ay = pt.y;
        b.el.style.width = colW + "px";
        b.w = colW; b.h = b.el.offsetHeight;
      });
      // Seite nach Lage des Orts; ist eine Spalte zu voll, wandern die Orte nahe der Mitte hinüber
      var left = [], right = [];
      boxes.slice().sort(function (a, b) { return a.ax - b.ax; }).forEach(function (b) { (b.ax < size.x / 2 ? left : right).push(b); });
      var height = function (list) { return d3.sum(list, function (b) { return b.h + gap; }); };
      // Spalten ausgleichen: Orte nahe der Mitte wandern in die kürzere Spalte
      while (left.length && height(left) - left[left.length - 1].h > height(right)) right.unshift(left.pop());
      while (right.length && height(right) - right[0].h > height(left)) left.push(right.shift());
      [[left, gap], [right, size.x - colW - gap]].forEach(function (side) {
        var list = side[0].sort(function (a, b) { return a.ay - b.ay; });
        var y = gap;
        list.forEach(function (b) { b.x = side[1]; b.y = Math.max(y, b.ay - b.h / 2); y = b.y + b.h + gap; });
        var bottom = size.y - gap;
        for (var i = list.length - 1; i >= 0; i--) {
          list[i].y = Math.max(gap, Math.min(list[i].y, bottom - list[i].h));
          bottom = list[i].y - gap;
        }
      });
      boxes.forEach(function (b) { b.el.style.transform = "translate(" + b.x + "px," + b.y + "px)"; });
      svg.attr("width", size.x).attr("height", size.y).selectAll("line").data(boxes).join("line")
        .attr("x1", function (b) { return b.ax; }).attr("y1", function (b) { return b.ay; })
        .attr("x2", function (b) { return b.x < size.x / 2 ? b.x + b.w : b.x; })
        .attr("y2", function (b) { return Math.max(b.y + 6, Math.min(b.ay, b.y + b.h - 6)); });
    }

    function fit() {
      var pad = on && wide() ? colW + 24 : 10;
      map.fitBounds(m.bounds, { paddingTopLeft: [pad, 20], paddingBottomRight: [pad, 20] });
    }

    map.on("move zoom resize", layout);
    return {
      show: function (v) {
        on = v;
        colW = Math.min(280, Math.round(el.clientWidth * 0.33));
        pane.style.display = on && wide() ? "" : "none";
        listEl.hidden = !(on && !wide());
        // Karte so hoch machen, dass beide Spalten Platz haben
        var need = 0;
        if (on && wide()) {
          boxes.forEach(function (b) { b.el.style.width = colW + "px"; });
          need = d3.sum(boxes, function (b) { return b.el.offsetHeight + 4; }) / 2 + 60;
        }
        el.style.height = on && wide() ? Math.max(560, Math.ceil(need)) + "px" : normalH;
        if (on && wide()) map.removeControl(map.zoomControl); else map.zoomControl.addTo(map);
        map.invalidateSize();
        fit();
        layout();
      }
    };
  }

  function drawMaps() {
    var missing = d3.rollups(samples.filter(function (d) { return d.lat == null; }), function (v) { return v.length; }, function (d) { return d.group; });
    root.querySelector("[data-bind=no-coords]").textContent = missing.length
      ? "Ohne Koordinaten und darum nicht auf der Karte: " + missing.map(function (m) { return m[0] + " (" + m[1] + ")"; }).join(", ") + "."
      : "";
    pointMap($("map-samples"), samples, function (d) { return d.river_label + (d.km != null && d.river !== "RO" ? " · " + d.km.toFixed(1) + " km" : ""); },
      function (d) { return d.group + " · " + d.taxon + " · " + dateDe(d.date) + " · " + fmtDe(d.value) + " ng/g (Σ 6 iPCB)"; });
    var ringMap = pointMap($("map-ringing"), birds, function (d) { return d.place || ""; },
      function (b) { return birdCard(b, true); });
    var labels = ringLabels(ringMap, $("ring-list"));
    var btn = $("btn-rings"), on = false;
    labels.show(false);
    btn.addEventListener("click", function () {
      on = !on;
      labels.show(on);
      ringMap.map.closePopup();
      btn.textContent = on ? "Ringe ausblenden" : "Alle Vogelringe einblenden";
      btn.setAttribute("aria-pressed", on);
    });
  }

  function withSeason(d) { return Object.assign({ saison: d.season + " " + d.year }, d); }
  function seasons(data) {
    return Array.from(new Set(data.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .map(function (d) { return d.saison; })));
  }

  function drawProfile() {
    var el = $("chart-profile");
    var data = birds.filter(function (d) { return d.km != null && (d.river === "SP" || d.river === "US"); }).map(withSeason);
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: width(el), height: 360, marginLeft: 110,
      x: { label: "km ab Punt dal Gall →", grid: true, domain: [0, 14] },
      y: { axis: null },
      fy: { domain: seasons(data), label: null },
      color: { domain: KEYS.slice(0, 2), range: KEY_COLORS.slice(0, 2), legend: true },
      symbol: { legend: true, domain: AGE, range: AGE_SYMBOLS },
      marks: [
        Plot.dot(data, Plot.dodgeY({
          x: "km", fy: "saison", stroke: key, symbol: "age_class", r: 4.5, strokeWidth: 2, anchor: "middle",
          channels: { Name: "name", Ort: "place", Datum: function (d) { return dateDe(d.date); } },
          tip: { format: { x: function (v) { return v + " km"; }, fy: false, stroke: false } }
        }))
      ]
    })));
  }

  function drawSeasons() {
    var el = $("chart-seasons");
    var data = birds.map(withSeason);
    var order = seasons(data);
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: width(el), height: 240, marginLeft: 40,
      x: { domain: order, label: null },
      y: { label: "Vögel", grid: true },
      color: ringColor,
      marks: [
        Plot.barY(data, Plot.groupX({ y: "count" }, {
          x: "saison", fill: "river_label", stroke: tok("--surface-1"), strokeWidth: 2, inset: 2, tip: true
        })),
        Plot.ruleY([0])
      ]
    })));
  }

  // ---------- Beobachtungen: Transekt × Monat ----------
  var MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  var monthLabel = function (m) { return MONTHS[+m.slice(5, 7) - 1] + " " + m.slice(2, 4); };
  var O = D.observations;

  function drawTransects() {
    var el = $("chart-transects");
    var cells = O.cells;
    var rows = Array.from(new Set(cells.map(function (c) { return c.transect; })));
    var max = d3.max(cells, function (c) { return c.n; });
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: Math.max(640, width(el)), height: 70 + 24 * rows.length,
      marginLeft: 150, marginBottom: 40,
      x: { domain: O.months, tickFormat: monthLabel, label: null, tickRotate: -45, padding: 0.06 },
      y: { domain: rows, label: null, padding: 0.06 },
      color: { type: "linear", domain: [0, max], range: ["#cde2fb", "#104281"], legend: true, label: "Beobachtungen" },
      marks: [
        Plot.cell(cells, {
          x: "month", y: "transect", fill: "n", rx: 3,
          channels: { Vögel: "birds", Beringungen: "ringing", Fänge: "catch", Ablesungen: "resight", Unberingt: "unringed" },
          tip: { format: { x: monthLabel, y: true, fill: true } }
        }),
        Plot.text(cells, {
          x: "month", y: "transect", text: "n", fontSize: 11,
          fill: function (c) { return c.n > max / 2 ? "white" : tok("--text-primary"); }
        })
      ]
    })));
  }

  var hidden = O.not_shown || [];
  root.querySelector("[data-bind=obs-not-shown]").textContent = hidden.length
    ? "Nicht gezeigt: " + hidden.map(function (h) { return h.where + " (" + h.n + ")"; }).join(", ") + "."
    : "";

  table($("table-birds"), birds, [
    ["Name", function (d) { return d.name; }],
    ["Beringt", function (d) { return dateDe(d.date); }],
    ["Gewässer", function (d) { return d.river_label; }],
    ["Ort", function (d) { return d.place; }],
    ["km ab PdG", function (d) { return d.km == null ? "" : d.km.toFixed(1); }],
    ["Alter", function (d) { return d.age_class; }],
    ["Geschlecht", function (d) { return d.sex; }]
  ]);

  $("notes").innerHTML = (D.notes || []).map(function (n) { return "<li>" + n + "</li>"; }).join("");

  function drawAll() { drawEggCharts(); drawChain($("chart-chain"), IPCB); drawChain($("chart-chain-dl"), DLPCB); drawProfile(); drawTransects(); drawSeasons(); }
  drawAll();
  drawMaps();
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(drawAll, 200); });
})();
