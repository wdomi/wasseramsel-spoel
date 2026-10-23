#!/usr/bin/env python3
"""Verschlüsselt den Inhalt der geschützten Seite (cinclus.qmd).

Aufruf:
    python3 tools/encrypt_hidden.py inhalt.html
Das Stichwort wird abgefragt. Ergebnis: assets/cinclus-vault.json

Die Klartext-Datei NICHT ins Repository legen (z. B. in hidden-src/, ist in .gitignore).
Benötigt: pip install cryptography
"""
import base64
import getpass
import json
import os
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITERATIONS = 600_000
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "cinclus-vault.json")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    html = open(sys.argv[1], encoding="utf-8").read().encode("utf-8")
    pw = os.environ.get("VAULT_PASSWORD") or getpass.getpass("Stichwort: ")
    salt, iv = os.urandom(16), os.urandom(12)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS)
    key = kdf.derive(pw.encode("utf-8"))
    ct = AESGCM(key).encrypt(iv, html, None)
    enc = lambda b: base64.b64encode(b).decode("ascii")
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"iterations": ITERATIONS, "salt": enc(salt), "iv": enc(iv), "ct": enc(ct)}, f)
        f.write("\n")
    print("geschrieben:", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
