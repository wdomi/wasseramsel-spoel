/***************************************************************************
 * Wasseramsel-Finder & Meldeformular (öffentliche Website)
 * - Farbringe wählen → passende Individuen mit Namen
 * - Beobachtung melden → E-Mail an die Projektleitung (via Vercel-API)
 **************************************************************************/

(function () {
  "use strict";

  // Backend: Vercel-App "merlsdalova" (siehe README)
  const API_BASE = window.DIPPER_API_BASE || "https://merlotschadaua.vercel.app";

  // Spöl zwischen Punt dal Gall und Ova Spin
  const DEFAULT_CENTER = [46.645, 10.18];

  const COLOR_PALETTE = {
    alu: "#808080", white: "#eee", red: "#e22c22", yellow: "#d6a51c",
    green: "#227722", blue: "#4b77b8", violet: "#6e009e", rosa: "#f58ac7",
    pink: "#e6007e", bronze: "#a0672d", black: "#222", black_nr: "#222"
  };
  const COLOR_ORDER = ["alu", "white", "red", "yellow", "green", "blue", "rosa", "pink", "violet", "bronze", "black", "black_nr"];

  const I18N = {
    de: {
      colors: { alu: "Alu", white: "weiss", red: "rot", yellow: "gelb", green: "grün", blue: "blau", rosa: "rosa", pink: "pink", violet: "violett", bronze: "bronze", black: "schwarz", black_nr: "schwarz #" },
      step1: "1 · Welche Farbringe haben Sie gesehen?",
      step1Hint: "Wählen Sie pro Bein bis zu zwei Farben. Links und rechts aus Sicht des Vogels. Die Reihenfolge oben/unten spielt keine Rolle.",
      left: "Linkes Bein", right: "Rechtes Bein",
      reset: "Auswahl zurücksetzen",
      matches: n => `${n} passende Wasseramsel${n === 1 ? "" : "n"}`,
      noMatch: "Keine Wasseramsel mit dieser Kombination bekannt. Melden Sie die Beobachtung trotzdem – Ihre Farbangaben werden mitgeschickt.",
      loading: "Wasseramseln werden geladen …",
      loadErr: "Die Liste konnte nicht geladen werden. Sie können trotzdem eine Beobachtung melden.",
      chosen: "Ausgewählt:", none: "keine Zuordnung",
      noBird: "Unsicher / ohne Ringe",
      step2: "2 · Wo und wann?",
      step2Hint: "Klicken Sie auf die Karte oder ziehen Sie den Marker an den Beobachtungsort.",
      locate: "📍 Mein Standort",
      date: "Datum", time: "Uhrzeit", count: "Anzahl Vögel",
      coords: "Koordinaten",
      step3: "3 · Ihre Angaben",
      name: "Name", email: "E-Mail", phone: "Telefon (freiwillig)",
      remark: "Bemerkung (Verhalten, Futter im Schnabel, Nest …)",
      consent: "Ich bin einverstanden, dass meine Angaben für das Wasseramsel-Projekt verwendet werden und ich bei Rückfragen kontaktiert werden darf.",
      submit: "Beobachtung senden",
      sending: "Wird gesendet …",
      ok: "Herzlichen Dank! Ihre Beobachtung wurde übermittelt.",
      err: "Senden fehlgeschlagen. Bitte versuchen Sie es später nochmals.",
      needPos: "Bitte setzen Sie den Beobachtungsort auf der Karte.",
      needConsent: "Bitte bestätigen Sie die Einwilligung.",
      geoErr: "Standort konnte nicht ermittelt werden."
    },
    it: {
      colors: { alu: "alu", white: "bianco", red: "rosso", yellow: "giallo", green: "verde", blue: "blu", rosa: "rosa", pink: "fucsia", violet: "viola", bronze: "bronzo", black: "nero", black_nr: "nero #" },
      step1: "1 · Quali anelli colorati ha visto?",
      step1Hint: "Scelga fino a due colori per zampa. Sinistra e destra dal punto di vista dell’uccello. L’ordine sopra/sotto non conta.",
      left: "Zampa sinistra", right: "Zampa destra",
      reset: "Azzera selezione",
      matches: n => `${n} merl${n === 1 ? "o" : "i"} acquaiol${n === 1 ? "o" : "i"} corrispondent${n === 1 ? "e" : "i"}`,
      noMatch: "Nessun merlo acquaiolo noto con questa combinazione. Segnali comunque l’osservazione – i colori indicati verranno trasmessi.",
      loading: "Caricamento dei merli acquaioli …",
      loadErr: "Impossibile caricare l’elenco. Può comunque segnalare un’osservazione.",
      chosen: "Selezionato:", none: "nessuna attribuzione",
      noBird: "Incerto / senza anelli",
      step2: "2 · Dove e quando?",
      step2Hint: "Clicchi sulla carta o trascini il marcatore nel luogo dell’osservazione.",
      locate: "📍 La mia posizione",
      date: "Data", time: "Ora", count: "Numero di uccelli",
      coords: "Coordinate",
      step3: "3 · I suoi dati",
      name: "Nome", email: "E-mail", phone: "Telefono (facoltativo)",
      remark: "Osservazioni (comportamento, cibo nel becco, nido …)",
      consent: "Acconsento che i miei dati vengano utilizzati per il progetto sul merlo acquaiolo e di essere contattato/a per eventuali domande.",
      submit: "Invia osservazione",
      sending: "Invio in corso …",
      ok: "Grazie mille! La sua osservazione è stata trasmessa.",
      err: "Invio non riuscito. La preghiamo di riprovare più tardi.",
      needPos: "Indichi il luogo dell’osservazione sulla carta.",
      needConsent: "La preghiamo di confermare il consenso.",
      geoErr: "Impossibile determinare la posizione."
    },
    fr: {
      colors: { alu: "alu", white: "blanc", red: "rouge", yellow: "jaune", green: "vert", blue: "bleu", rosa: "rose", pink: "fuchsia", violet: "violet", bronze: "bronze", black: "noir", black_nr: "noir #" },
      step1: "1 · Quelles bagues de couleur avez-vous vues ?",
      step1Hint: "Choisissez jusqu’à deux couleurs par patte. Gauche et droite du point de vue de l’oiseau. L’ordre haut/bas n’a pas d’importance.",
      left: "Patte gauche", right: "Patte droite",
      reset: "Réinitialiser",
      matches: n => `${n} cincle${n === 1 ? "" : "s"} correspondant${n === 1 ? "" : "s"}`,
      noMatch: "Aucun cincle connu avec cette combinaison. Signalez quand même l’observation – les couleurs indiquées seront transmises.",
      loading: "Chargement des cincles …",
      loadErr: "La liste n’a pas pu être chargée. Vous pouvez quand même signaler une observation.",
      chosen: "Sélection :", none: "aucune attribution",
      noBird: "Incertain / sans bagues",
      step2: "2 · Où et quand ?",
      step2Hint: "Cliquez sur la carte ou déplacez le marqueur vers le lieu d’observation.",
      locate: "📍 Ma position",
      date: "Date", time: "Heure", count: "Nombre d’oiseaux",
      coords: "Coordonnées",
      step3: "3 · Vos coordonnées",
      name: "Nom", email: "E-mail", phone: "Téléphone (facultatif)",
      remark: "Remarque (comportement, nourriture au bec, nid …)",
      consent: "J’accepte que mes données soient utilisées pour le projet sur le cincle plongeur et que l’on me contacte en cas de question.",
      submit: "Envoyer l’observation",
      sending: "Envoi en cours …",
      ok: "Merci beaucoup ! Votre observation a été transmise.",
      err: "L’envoi a échoué. Veuillez réessayer plus tard.",
      needPos: "Veuillez indiquer le lieu d’observation sur la carte.",
      needConsent: "Veuillez confirmer votre consentement.",
      geoErr: "Impossible de déterminer votre position."
    }
  };

  const lang = (document.documentElement.lang || "de").slice(0, 2);
  const T = I18N[lang] || I18N.de;

  let birds = [];
  let selectedLeft = [];
  let selectedRight = [];
  let selectedBird = null;   // bird object or null
  let map = null;
  let marker = null;
  let position = null;       // [lat, lon]

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function pill(c) {
    if (!c) return `<span class="pill" style="background:#f1f1f1;color:#999">–</span>`;
    const text = c === "white" || c === "rosa" ? "#000" : "#fff";
    return `<span class="pill" style="background:${COLOR_PALETTE[c]};color:${text}">${esc(T.colors[c] || c)}</span>`;
  }

  // ----------------------------------------------------------------------
  // UI SKELETON
  // ----------------------------------------------------------------------

  function buildUI(root) {
    const today = new Date();
    const pad = n => String(n).padStart(2, "0");
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const timeStr = `${pad(today.getHours())}:${pad(today.getMinutes())}`;

    root.innerHTML = `
      <div class="finder-step">
        <h3>${T.step1}</h3>
        <p class="hint">${T.step1Hint}</p>
        <div class="legs">
          <div><div class="leg-title">${T.left}</div><div id="left-leg" class="color-grid"></div></div>
          <div><div class="leg-title">${T.right}</div><div id="right-leg" class="color-grid"></div></div>
        </div>
        <p style="margin-top:.6rem"><button type="button" class="btn btn-sm btn-outline-secondary" id="btn-reset">${T.reset}</button></p>
        <div id="match-count" class="hint">${T.loading}</div>
        <div id="bird-list" class="bird-list"></div>
        <div id="selected-bird" class="selected-bird"></div>
      </div>

      <form id="obs-form" novalidate>
        <div class="finder-step">
          <h3>${T.step2}</h3>
          <p class="hint">${T.step2Hint}</p>
          <button type="button" class="btn btn-sm btn-outline-primary" id="btn-locate">${T.locate}</button>
          <div id="obs-map"></div>
          <div class="hint">${T.coords}: <span id="coords">–</span></div>
          <div class="form-grid" style="margin-top:.8rem">
            <div><label for="f-date">${T.date}</label><input class="form-control" type="date" id="f-date" value="${dateStr}" max="${dateStr}" required></div>
            <div><label for="f-time">${T.time}</label><input class="form-control" type="time" id="f-time" value="${timeStr}"></div>
            <div><label for="f-count">${T.count}</label><input class="form-control" type="number" id="f-count" min="1" max="20" value="1"></div>
          </div>
        </div>

        <div class="finder-step">
          <h3>${T.step3}</h3>
          <div class="form-grid">
            <div><label for="f-name">${T.name} *</label><input class="form-control" id="f-name" autocomplete="name" required></div>
            <div><label for="f-email">${T.email} *</label><input class="form-control" type="email" id="f-email" autocomplete="email" required></div>
            <div><label for="f-phone">${T.phone}</label><input class="form-control" type="tel" id="f-phone" autocomplete="tel"></div>
            <div class="full"><label for="f-remark">${T.remark}</label><textarea class="form-control" id="f-remark" rows="3"></textarea></div>
            <div class="full"><label style="font-weight:400"><input type="checkbox" id="f-consent"> ${T.consent}</label></div>
            <input class="hp" id="f-website" tabindex="-1" autocomplete="off" aria-hidden="true">
          </div>
          <p style="margin-top:1rem"><button type="submit" class="cta" id="btn-submit" style="border:0">${T.submit}</button></p>
          <div id="form-msg"></div>
        </div>
      </form>`;
  }

  // ----------------------------------------------------------------------
  // RING COLOUR FINDER
  // ----------------------------------------------------------------------

  function buildColorButtons() {
    ["left", "right"].forEach(side => {
      const el = document.getElementById(side + "-leg");
      el.innerHTML = "";
      COLOR_ORDER.forEach(color => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "color-button";
        btn.dataset.color = color;
        btn.textContent = T.colors[color] || color;
        btn.style.background = COLOR_PALETTE[color];
        btn.style.color = color === "white" || color === "rosa" ? "#000" : "#fff";
        btn.onclick = () => toggleColor(side, color, btn);
        el.appendChild(btn);
      });
    });
  }

  function toggleColor(side, color, btn) {
    const arr = side === "left" ? selectedLeft : selectedRight;
    if (arr.includes(color)) {
      arr.splice(arr.indexOf(color), 1);
      btn.classList.remove("selected");
    } else if (arr.length < 2) {
      arr.push(color);
      btn.classList.add("selected");
    }
    selectBird(null);
    renderBirds();
  }

  function birdMatches(b) {
    const L = [b.L_top, b.L_bottom].filter(Boolean);
    const R = [b.R_top, b.R_bottom].filter(Boolean);
    return selectedLeft.every(c => L.includes(c)) && selectedRight.every(c => R.includes(c));
  }

  function renderBirds() {
    const list = document.getElementById("bird-list");
    const count = document.getElementById("match-count");
    const hits = birds.filter(birdMatches);

    count.textContent = hits.length ? T.matches(hits.length) : (birds.length ? T.noMatch : count.textContent);

    list.innerHTML = "";
    hits.forEach(b => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "bird-card" + (selectedBird && selectedBird.id === b.id ? " selected" : "");
      card.innerHTML = `
        <span class="name">${esc(b.name || "?")}</span>
        <span class="rings">
          ${pill(b.L_top)}${pill(b.R_top)}
          ${pill(b.L_bottom)}${pill(b.R_bottom)}
        </span>`;
      card.onclick = () => { selectBird(selectedBird && selectedBird.id === b.id ? null : b); renderBirds(); };
      list.appendChild(card);
    });

    const none = document.createElement("button");
    none.type = "button";
    none.className = "bird-card";
    none.innerHTML = `<span class="name">${T.noBird}</span>`;
    none.onclick = () => { selectBird(null); renderBirds(); };
    list.appendChild(none);
  }

  function selectBird(b) {
    selectedBird = b;
    document.getElementById("selected-bird").innerHTML =
      `${T.chosen} ${b ? esc(b.name) : T.none}`;
  }

  async function loadBirds() {
    try {
      const r = await fetch(API_BASE + "/api/public-birds");
      if (!r.ok) throw new Error(r.status);
      birds = await r.json();
      renderBirds();
    } catch (err) {
      console.error("Birds could not be loaded:", err);
      document.getElementById("match-count").textContent = T.loadErr;
      renderBirds();
    }
  }

  // ----------------------------------------------------------------------
  // MAP
  // ----------------------------------------------------------------------

  function setPosition(lat, lon) {
    position = [lat, lon];
    if (!marker) {
      marker = L.marker(position, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPosition(p.lat, p.lng);
      });
    } else {
      marker.setLatLng(position);
    }
    document.getElementById("coords").textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }

  function initMap() {
    map = L.map("obs-map").setView(DEFAULT_CENTER, 13);
    L.tileLayer(
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
      { maxZoom: 18, attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>' }
    ).addTo(map);
    map.on("click", e => setPosition(e.latlng.lat, e.latlng.lng));

    document.getElementById("btn-locate").onclick = () => {
      if (!navigator.geolocation) return alert(T.geoErr);
      navigator.geolocation.getCurrentPosition(
        pos => {
          setPosition(pos.coords.latitude, pos.coords.longitude);
          map.setView(position, 15);
        },
        () => alert(T.geoErr),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    };
  }

  // ----------------------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------------------

  function showMsg(text, ok) {
    document.getElementById("form-msg").innerHTML = `<div class="msg ${ok ? "ok" : "err"}">${esc(text)}</div>`;
  }

  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    const val = id => document.getElementById(id).value.trim();

    if (!position) return showMsg(T.needPos, false);
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!document.getElementById("f-consent").checked) return showMsg(T.needConsent, false);

    const rings = selectedBird
      ? { L_top: selectedBird.L_top, L_bottom: selectedBird.L_bottom, R_top: selectedBird.R_top, R_bottom: selectedBird.R_bottom }
      : { L_top: selectedLeft[0] || "", L_bottom: selectedLeft[1] || "", R_top: selectedRight[0] || "", R_bottom: selectedRight[1] || "" };

    const payload = {
      individual_id: selectedBird ? selectedBird.id : null,
      rings,
      date: val("f-date"),
      time: val("f-time"),
      count: val("f-count"),
      latitude: position[0],
      longitude: position[1],
      remark: val("f-remark"),
      observer_name: val("f-name"),
      observer_email: val("f-email"),
      observer_phone: val("f-phone"),
      website: val("f-website"),
      lang
    };

    const btn = document.getElementById("btn-submit");
    btn.disabled = true;
    btn.textContent = T.sending;

    try {
      const r = await fetch(API_BASE + "/api/public-observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(r.status);
      showMsg(T.ok, true);
      document.getElementById("f-remark").value = "";
    } catch (err) {
      console.error("Submit failed:", err);
      showMsg(T.err, false);
    } finally {
      btn.disabled = false;
      btn.textContent = T.submit;
    }
  }

  // ----------------------------------------------------------------------
  // INIT
  // ----------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("dipper-finder");
    if (!root) return;

    buildUI(root);
    buildColorButtons();
    selectBird(null);
    initMap();
    loadBirds();

    document.getElementById("btn-reset").onclick = () => {
      selectedLeft = [];
      selectedRight = [];
      document.querySelectorAll(".color-button.selected").forEach(b => b.classList.remove("selected"));
      selectBird(null);
      renderBirds();
    };
    document.getElementById("obs-form").addEventListener("submit", submit);
  });
})();
