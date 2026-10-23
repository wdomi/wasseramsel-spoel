// Geschützte Seite: Inhalt liegt AES-GCM-verschlüsselt in cinclus-vault.json.
// Der Schlüssel wird mit PBKDF2 aus dem Stichwort abgeleitet (siehe tools/encrypt_hidden.py).
(function () {
  var root = document.getElementById("vault");
  if (!root) return;
  var form = root.querySelector("form");
  var input = root.querySelector("input");
  var msg = root.querySelector(".vault-msg");
  var out = document.getElementById("vault-content");
  var KEY = "cinclus-vault-pw";

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  async function unlock(pw) {
    var res = await fetch(root.dataset.src, { cache: "no-store" });
    var v = await res.json();
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64(v.salt), iterations: v.iterations, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(v.iv) }, key, b64(v.ct));
    return new TextDecoder().decode(plain);
  }

  async function attempt(pw, silent) {
    msg.textContent = silent ? "" : "…";
    try {
      out.innerHTML = await unlock(pw);
      form.hidden = true;
      msg.textContent = "";
      try { sessionStorage.setItem(KEY, pw); } catch (e) {}
    } catch (e) {
      msg.textContent = silent ? "" : "Falsches Stichwort.";
      try { sessionStorage.removeItem(KEY); } catch (e2) {}
    }
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    attempt(input.value, false);
  });

  var saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (e) {}
  if (saved) attempt(saved, true);
})();
