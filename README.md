# Wasseramsel am Spöl – Projektwebsite

Quarto-Website (DE / IT / FR / EN) zum Wasseramsel-Projekt als Begleitprojekt der PCB-Sanierung des Spöl im Schweizerischen Nationalpark.

- `index.qmd`, `it/index.qmd`, `fr/index.qmd`, `en/index.qmd` – Projektvorstellung mit Namenssuche
- `beobachtung.qmd`, `it/osservazione.qmd`, `fr/observation.qmd`, `en/report.qmd` – Farbring-Finder und Meldeformular
- `assets/finder.js` – Finder, Karte (swisstopo) und Formular, alle Texte in vier Sprachen

## Backend

Finder und Formular nutzen zwei Endpunkte der bestehenden Vercel-App
[`wdomi/merlsdalova`](https://github.com/wdomi/merlsdalova) (`https://dipper-finder.vercel.app`):

| Endpunkt | Zweck |
|---|---|
| `GET /api/public-birds` | Namen und Farbringe der Wasseramseln (keine Ringnummern, Neststandorte o. ä.) |
| `POST /api/public-observation` | Schickt die Meldung per E-Mail (Resend) an die Projektleitung; nichts wird in die Datenbank geschrieben |

Benötigte Umgebungsvariablen in Vercel:

- `RESEND_API_KEY` – API-Key von [resend.com](https://resend.com)
- `OBSERVATION_EMAIL_TO` – Empfängeradresse(n), kommagetrennt
- `OBSERVATION_EMAIL_FROM` – optional, Absender einer bei Resend verifizierten Domain
- `ALLOWED_ORIGINS` – optional, Standard `https://wdomi.github.io`

## Lokal ansehen

```sh
quarto preview
```

## Veröffentlichen

Jeder Push auf `main` rendert die Seite mit GitHub Actions und veröffentlicht sie auf GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).

## Versteckte Seite (`cinclus.qmd`)

Ein Klick auf die auffliegende Wasseramsel in der Kopfzeile öffnet `cinclus.html`. Der Inhalt liegt nur
verschlüsselt im Repository (`assets/cinclus-vault.json`, AES-GCM, Schlüssel per PBKDF2 aus dem Stichwort)
und wird erst im Browser nach Eingabe des Stichworts entschlüsselt. Das schützt den Inhalt, solange das
Stichwort geheim bleibt; die Seite selbst (Formular) ist aber öffentlich erreichbar.

Inhalt ändern: HTML lokal schreiben (z. B. `hidden-src/inhalt.html`, nicht committen) und

```sh
python3 tools/encrypt_hidden.py hidden-src/inhalt.html
```

ausführen; danach `assets/cinclus-vault.json` committen.
