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
      return Object.assign({ xr: (i - (a.length - 1) / 2) * 0.3 - 0.35 }, d);   // links, rechts Platz für Ø
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
    // Mittelwert je Gewässer (arithmetisch, im gewählten Jahr): Linie über den Bereich der Proben, Zahl in Flussfarbe
    var meanOf = function (rows, x0, x1) {
      if (!rows.length) return [];
      var m = d3.mean(rows, function (d) { return d[metric.field]; });
      return [{ x1: x0, x2: x1, y: m, k: key(rows[0]), n: rows.length }];
    };
    var spoelMeans = ["SP", "US"].flatMap(function (r) {
      var rows = spoel.filter(function (d) { return d.river === r; });
      var ext = d3.extent(rows, function (d) { return d.xk; });
      return meanOf(rows, ext[0] - 0.3, ext[1] + 0.3);
    });
    var romMeans = meanOf(rom, -0.95, 0.15);
    var meanColor = function (m) { return KEY_COLORS[KEYS.indexOf(m.k)]; };
    var meanLines = function (ms) {
      return Plot.ruleY(ms, { x1: "x1", x2: "x2", y: "y", stroke: meanColor, strokeWidth: 2, strokeDasharray: "6,3" });
    };
    // Zahl neben der Linie, wo keine Punkte liegen (SP rechts, US links, Rom rechts)
    var meanLabels = function (ms, x, anchor, dx) {
      return Plot.text(ms, { x: x, y: "y", text: function (m) { return "Ø " + fmtV(m.y); }, fill: meanColor,
        stroke: tok("--surface-1"), strokeWidth: 3, paintOrder: "stroke", fontWeight: 700, fontSize: 12, textAnchor: anchor, dx: dx });
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
        meanLines(spoelMeans),
        dot(spoel, "xk"),
        meanLabels(spoelMeans.filter(function (m) { return m.k === "Oberer Spöl"; }), "x2", "start", 4),
        meanLabels(spoelMeans.filter(function (m) { return m.k === "Unterer Spöl"; }), "x1", "end", -4)
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
        meanLines(romMeans),
        dot(rom, "xr"),
        meanLabels(romMeans, function () { return 1; }, "end", 0)
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
  var GROUPS = ["Makrozoobenthos", "Ufer-Spinnen", "Fische", "Fischlaich", "Wasseramsel-Eier"];

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

  // ---------- Probenahmekarte: eigenes Symbol pro Probengruppe ----------
  // Platzhalter-Symbole (viewBox 0 0 32 32, gefüllt mit currentColor = Farbe des Gewässers).
  // Eigene Symbole: SVG-Dateien in hidden/markers/ (siehe README dort) ersetzen diese automatisch.
  var MARKERS = {
    "Wasseramsel-Eier": '<ellipse cx="16" cy="17" rx="9" ry="12"/>',
    "Fische": '<path d="M3 16c5-7 14-8 20-3l6-5v16l-6-5c-6 5-15 4-20-3z"/><circle cx="9" cy="14.5" r="1.6" fill="#fff"/>',
    "Fischlaich": '<circle cx="10" cy="11" r="6"/><circle cx="22" cy="11" r="6"/><circle cx="16" cy="22" r="6"/>',
    "Makrozoobenthos": '<path d="M16 3l13 13-13 13L3 16z"/>',
    "Ufer-Spinnen": '<circle cx="16" cy="16" r="6"/><path d="M16 16L4 5M16 16L28 5M16 16L3 16M16 16L29 16M16 16L4 27M16 16L28 27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'
  };
  function markerSvg(group, color) {
    var custom = (D.markers || {})[group];
    var inner = custom || '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' + MARKERS[group] + "</svg>";
    return '<span class="cinclus-marker" style="color:' + color + '">' + inner + "</span>";
  }

  function sampleMap(el, rows) {
    var map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
      { maxZoom: 18, attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>' }).addTo(map);
    var layer = L.featureGroup().addTo(map);
    var size = 26;
    d3.groups(rows.filter(function (d) { return d.lat != null; }), function (d) { return d.lat + "," + d.lon; })
      .forEach(function (place) {
        var byGroup = d3.groups(place[1], function (d) { return d.group; });
        byGroup.forEach(function (g, i) {
          // mehrere Gruppen am selben Ort: Symbole im Kreis um den Ort anordnen
          var n = byGroup.length, ang = 2 * Math.PI * i / n - Math.PI / 2, r = n > 1 ? 13 : 0;
          var list = g[1], first = list[0];
          var icon = L.divIcon({
            className: "", html: markerSvg(g[0], colorOf(first)), iconSize: [size, size],
            iconAnchor: [size / 2 - r * Math.cos(ang), size / 2 - r * Math.sin(ang)]
          });
          L.marker([first.lat, first.lon], { icon: icon, title: g[0] + " (" + list.length + ")" })
            .bindPopup("<b>" + g[0] + " · " + first.river_label + "</b><br>" + list.map(function (d) {
              return d.taxon + " · " + dateDe(d.date) + " · " + fmtV(d.value) + " ng/g Σ 6 iPCB" +
                (d.dl > 0 ? ", " + fmtV(d.dl) + " ng/g Σ 12 dl-PCB" : "");
            }).join("<br>"), { maxWidth: 340 }).addTo(layer);
        });
      });
    map.fitBounds(layer.getBounds().pad(0.1));
    $("samples-legend").innerHTML = GROUPS.map(function (g) {
      return '<span class="item">' + markerSvg(g, tok("--text-secondary")) + g + "</span>";
    }).join("");
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
    // Reihenfolge flussabwärts: Spöl nach km ab Punt dal Gall, Ova dal Fuorn am Schluss
    var RIVER_ORDER = { SP: 0, US: 0, OF: 1 };
    var places = m.places.map(function (p) {
      var f = p[1][0];
      return { birds: p[1].slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), lat: f.lat, lon: f.lon, place: f.place, km: f.km, river: f.river };
    }).sort(function (a, b) {
      return (RIVER_ORDER[a.river] || 0) - (RIVER_ORDER[b.river] || 0) || (a.km || 0) - (b.km || 0);
    });
    var head = function (p) {
      return '<div class="cinclus-label-head">' + (p.place || "") + (p.km != null && p.river !== "OF" ? " · " + p.km.toFixed(1) + " km" : "") + "</div>";
    };
    var boxes = places.map(function (p) {
      var box = L.DomUtil.create("div", "cinclus-label", pane);
      box.innerHTML = head(p) + p.birds.map(function (b) { return birdCard(b, false); }).join("");
      return Object.assign({ el: box }, p);
    });
    listEl.innerHTML = places.map(function (p) {
      return '<div class="cinclus-ringlist-place">' + head(p) + '<div class="cinclus-ringlist-birds">' +
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
      // Gelesen wie ein Text: linke Spalte von oben nach unten, dann rechte Spalte, flussabwärts geordnet
      var total = d3.sum(boxes, function (b) { return b.h + gap; }), acc = 0;
      var left = boxes.filter(function (b) { acc += b.h + gap; return acc - (b.h + gap) / 2 <= total / 2; });
      var right = boxes.slice(left.length);
      [[left, gap], [right, size.x - colW - gap]].forEach(function (side) {
        var y = gap;
        side[0].forEach(function (b) { b.x = side[1]; b.y = y; y += b.h + gap; });
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
          need = d3.sum(boxes, function (b) { return b.el.offsetHeight + 4; }) / 2 + d3.max(boxes, function (b) { return b.el.offsetHeight; }) + 12;
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
    sampleMap($("map-samples"), samples);
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
    var cols = O.transects.map(function (t) { return t.transect_code; });
    var nameOf = {}, riverOf = {};
    O.transects.forEach(function (t) { nameOf[t.transect_code] = t.transect; riverOf[t.transect_code] = t.river; });
    // ganzes Raster als leere Zellen, damit Transekte ohne Beobachtungen sichtbar bleiben
    var grid = d3.cross(cols, O.months).map(function (p) { return { transect_code: p[0], month: p[1] }; });
    var heads = ["SP", "US", "RO"].map(function (r) {
      var c = cols.filter(function (k) { return riverOf[k] === r; });
      return { river: r, x: c[Math.floor((c.length - 1) / 2)], label: { SP: "Oberer Spöl", US: "Unterer Spöl", RO: "Rom" }[r] };
    }).filter(function (h) { return h.x; });
    var max = d3.max(cells, function (c) { return c.n; });
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: Math.max(760, width(el)), height: 90 + 22 * O.months.length,
      marginLeft: 56, marginTop: 40, marginBottom: 50,
      x: { domain: cols, label: null, tickRotate: -90, padding: 0.08, axis: "bottom" },
      y: { domain: O.months, tickFormat: monthLabel, label: null, padding: 0.08 },
      color: { type: "linear", domain: [0, max], range: ["#cde2fb", "#104281"], legend: true, label: "Beobachtungen" },
      marks: [
        Plot.cell(grid, { x: "transect_code", y: "month", fill: "#e9e7e0", fillOpacity: 0.7, rx: 2 }),
        Plot.cell(cells, {
          x: "transect_code", y: "month", fill: "n", rx: 3,
          channels: { Transekt: "transect", Vögel: "birds", Beringungen: "ringing", Fänge: "catch", Ablesungen: "resight", Unberingt: "unringed" },
          tip: { format: { x: false, y: monthLabel, fill: true } }
        }),
        Plot.text(cells, {
          x: "transect_code", y: "month", text: "n", fontSize: 10,
          fill: function (c) { return c.n > max / 2 ? "white" : tok("--text-primary"); }
        }),
        Plot.text(heads, { x: "x", text: "label", frameAnchor: "top", dy: -28, fontWeight: 600, fontSize: 12,
          fill: function (h) { return h.river === "RO" ? KEY_COLORS[2] : h.river === "US" ? KEY_COLORS[1] : KEY_COLORS[0]; } })
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
