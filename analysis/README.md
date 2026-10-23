# Auswertung für die versteckte Seite

R-Skripte, die Daten aus der Cinclopedia-Datenbank (Supabase) holen, aufbereiten und daraus den Inhalt
der versteckten Seite `cinclus.html` bauen. Die Grafiken selbst zeichnet der Browser mit
[Observable Plot](https://observablehq.com/plot/) und Leaflet (Code in `../hidden/page.js`).

```
analysis/
  analysis.Rproj        in RStudio öffnen (setzt das Arbeitsverzeichnis auf analysis/)
  run_all.R             ganze Kette in einem Lauf
  .Renviron.example     Vorlage für die Datenbank-Verbindung
  sql/                  Abfragen (nur lesend)
  R/00_setup.R          Pakete, Pfade, Gewässer-Beschriftungen
  R/01_fetch.R          Datenbank -> data-raw/*.csv
  R/02_pcb.R            PCB-Proben gruppieren, Blindwerte/unsichere Werte markieren
  R/03_ringing.R        Beringungen, Altersklassen vereinheitlichen
  R/04_build_page.R     Vorlage + Daten -> ../hidden-src/inhalt.html und preview.html
hidden/                 Layout, Stil und Grafik-Code der Seite (ohne Daten)
hidden-src/             erzeugter Klartext mit Daten (nicht im Repo)
```

## Einrichten (einmal)

1. R-Pakete: `install.packages(c("dplyr", "readr", "jsonlite", "DBI", "RPostgres", "rstudioapi"))`
2. Python-Paket fürs Verschlüsseln: `pip install cryptography`
3. `.Renviron.example` nach `.Renviron` kopieren, die Verbindungs-URI aus Supabase eintragen
   (Projekt Cinclopedia → Connect → Session pooler) und R neu starten.

## Seite aktualisieren

In RStudio `analysis.Rproj` öffnen, `run_all.R` öffnen und «Source» drücken. In VS Code oder im
Terminal: `cd analysis && Rscript run_all.R`.

- Danach `hidden-src/preview.html` im Browser ansehen (öffnet sich in RStudio automatisch).
- Passt alles: in `run_all.R` `encrypt <- TRUE` setzen und nochmals laufen lassen (fragt nach dem
  Stichwort), dann `assets/cinclus-vault.json` committen. Nur diese verschlüsselte Datei kommt ins Repo.

Ohne Datenbankzugang: `fetch_from_db <- FALSE` setzen und die CSV in `data-raw/` verwenden.

## Grafiken ändern

Texte und Reihenfolge: `hidden/template.html`. Grafiken: `hidden/page.js` (Observable Plot,
[Doku](https://observablehq.com/plot/what-is-plot)). Farben: `hidden/page.css`. Danach `run_all.R`.
