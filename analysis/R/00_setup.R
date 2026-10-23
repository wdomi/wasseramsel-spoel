# Gemeinsame Einstellungen für alle Skripte.
# Wird von run_all.R geladen; einzeln: source("R/00_setup.R") mit analysis/ als Arbeitsverzeichnis.

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(jsonlite)
})

# Pfade relativ zu analysis/
dir_raw    <- "data-raw"               # DB-Abzug als CSV (nicht im Repo)
dir_out    <- "../hidden-src"          # Klartext der versteckten Seite (nicht im Repo)
dir_page   <- "../hidden"              # Vorlage: Layout + Grafik-Code, ohne Daten
dir.create(dir_raw, showWarnings = FALSE)
dir.create(dir_out, showWarnings = FALSE)

# Gewässer: Reihenfolge und Beschriftung für alle Grafiken
rivers <- tibble::tribble(
  ~river, ~river_label,       ~river_role,
  "SP",   "Oberer Spöl",      "belastet",
  "US",   "Unterer Spöl",     "belastet",
  "RO",   "Rom",              "Vergleich",
  "OF",   "Ova dal Fuorn",    "Vergleich"
)

# Höchstwert Hühnereier: 40 ng/g Fett (Summe 6 iPCB)
limit_chicken_egg <- 40
