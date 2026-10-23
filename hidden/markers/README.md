# Symbole für die Probenahmekarte

Eigene Symbole hier als SVG ablegen, dann `analysis/run_all.R` laufen lassen. Fehlt eine Datei, nimmt die
Seite das eingebaute Platzhalter-Symbol.

| Datei | Probengruppe |
|---|---|
| `wasseramsel-eier.svg` | Wasseramsel-Eier |
| `fische.svg` | Fische |
| `fischlaich.svg` | Fischlaich |
| `makrozoobenthos.svg` | Makrozoobenthos |
| `ufer-spinnen.svg` | Ufer-Spinnen |

Format:

- SVG, quadratisch (z. B. `viewBox="0 0 32 32"`), transparenter Hintergrund.
- Einfarbige Silhouette ohne feste Farbe (`fill="currentColor"` oder gar keine Farbe): die Seite färbt das
  Symbol in der Farbe des Gewässers (blau / orange / grün).
- Gezeigt wird es etwa 26 × 26 Pixel gross, feine Details gehen also verloren.
