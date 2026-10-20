# Wasseramsel am Spöl – Projektwebsite

Quarto-Website (DE / IT / FR) zum Wasseramsel-Projekt als Begleitprojekt der PCB-Sanierung des Spöl im Schweizerischen Nationalpark.

- `index.qmd`, `it/index.qmd`, `fr/index.qmd` – Projektvorstellung
- `beobachtung.qmd`, `it/osservazione.qmd`, `fr/observation.qmd` – Farbring-Finder und Meldeformular
- `assets/finder.js` – Finder, Karte (swisstopo) und Formular, alle Texte in drei Sprachen

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
