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
  var dateDe = function (s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : ""; };
  var width = function (el) { return Math.max(320, el.clientWidth || 640); };
  var $ = function (id) { return document.getElementById(id); };

  root.querySelectorAll("[data-bind=generated]").forEach(function (el) { el.textContent = dateDe(D.generated); });

  var common = {
    style: { fontSize: "13px", color: tok("--text-primary"), background: "transparent" },
    marginLeft: 120
  };
  var xLog = { type: "log", label: "Summe 6 iPCB (ng/g Fett) →", grid: true, tickFormat: fmtDe };
  var tipPcb = {
    channels: { Probe: "label", Datum: function (d) { return dateDe(d.date); }, Gewässer: "river_label" },
    format: { x: function (v) { return fmtDe(v) + " ng/g"; }, y: false, stroke: false, fill: false }
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

  function drawEggs() {
    var el = $("chart-eggs");
    var y = yearSel.value;
    var data = eggs.filter(function (d) { return !y || String(d.year) === y; });
    var spoel = spread(data.filter(function (d) { return d.river !== "RO" && d.km != null; }), 0.09);
    var rom = data.filter(function (d) { return d.river === "RO"; }).map(function (d, i, a) {
      return Object.assign({ xr: (i - (a.length - 1) / 2) * 0.35 }, d);
    });
    var yScale = { type: "log", domain: [20, 100000], label: "↑ Summe 6 iPCB (ng/g Fett)", grid: true, tickFormat: fmtDe };
    var limitRule = Plot.ruleY([D.pcb.limit], { stroke: tok("--text-muted"), strokeDasharray: "4,3" });
    var dot = function (rows, x) {
      return Plot.dot(rows, Object.assign({
        x: x, y: "value", fill: key, r: 5, stroke: tok("--surface-1"), strokeWidth: 1.5,
        channels: Object.assign({ km: "km" }, tipPcb.channels),
        tip: { format: { x: false, y: function (v) { return fmtDe(v) + " ng/g"; }, fill: false, km: function (v) { return v == null ? "" : v + " km"; } } }
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
        Plot.text(["Hühnerei-Höchstwert"], { x: 13.5, y: D.pcb.limit, dy: -8, textAnchor: "end", fill: tok("--text-secondary"), fontSize: 11 }),
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
  yearSel.addEventListener("change", drawEggs);

  // ---------- PCB: Nahrungskette ----------
  var GROUPS = ["Makrozoobenthos", "Ufer-Spinnen", "Fischlaich", "Fische", "Wasseramsel-Eier"];

  function drawChain() {
    var el = $("chart-chain");
    el.replaceChildren(Plot.plot(Object.assign({}, common, {
      width: width(el), height: 320,
      x: Object.assign({}, xLog, { domain: [10, 100000] }),
      y: { domain: GROUPS.slice().reverse(), label: null },
      color: riverColor,
      marks: [
        Plot.ruleX([D.pcb.limit], { stroke: tok("--text-muted"), strokeDasharray: "4,3" }),
        Plot.dot(samples, {
          x: "value", y: "group",
          stroke: key, r: 5, strokeWidth: 2, fill: key,
          fillOpacity: function (d) { return d.unit_uncertain ? 0 : 0.85; }
        }),
        Plot.tip(samples, Plot.pointer(Object.assign({ x: "value", y: "group" }, tipPcb)))
      ]
    })));
  }

  table($("table-pcb"), samples, [
    ["Gruppe", function (d) { return d.group; }],
    ["Art", function (d) { return d.taxon; }],
    ["Probe", function (d) { return d.label; }],
    ["Gewässer", function (d) { return d.river_label; }],
    ["Datum", function (d) { return dateDe(d.date); }],
    ["ng/g Fett", function (d) { return d.value; }],
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
        radius: 5 + 3 * Math.sqrt(list.length), color: "#fff", weight: 2, fillColor: colorOf(first), fillOpacity: 0.85
      }).bindPopup("<b>" + title(first) + "</b><br>" + list.map(line).join("<br>")).addTo(layer);
    });
    map.fitBounds(layer.getBounds().pad(0.1));
  }

  function drawMaps() {
    var missing = d3.rollups(samples.filter(function (d) { return d.lat == null; }), function (v) { return v.length; }, function (d) { return d.group; });
    root.querySelector("[data-bind=no-coords]").textContent = missing.length
      ? "Ohne Koordinaten und darum nicht auf der Karte: " + missing.map(function (m) { return m[0] + " (" + m[1] + ")"; }).join(", ") + "."
      : "";
    pointMap($("map-samples"), samples, function (d) { return d.river_label + (d.km != null && d.river !== "RO" ? " · " + d.km.toFixed(1) + " km" : ""); },
      function (d) { return d.group + " · " + d.taxon + " · " + dateDe(d.date) + " · " + fmtDe(d.value) + " ng/g"; });
    pointMap($("map-ringing"), birds, function (d) { return d.place || ""; },
      function (b) { return b.name + " · " + dateDe(b.date) + " · " + b.age_class; });
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

  function drawAll() { drawEggs(); drawChain(); drawProfile(); drawSeasons(); }
  drawAll();
  drawMaps();
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(drawAll, 200); });
})();
