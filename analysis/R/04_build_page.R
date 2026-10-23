# Setzt Vorlage (hidden/), Grafik-Code und Daten zur versteckten Seite zusammen.
# Schreibt (beides nicht im Repo, Ordner hidden-src/ ist in .gitignore):
#   hidden-src/inhalt.html   – Inhalt für die Verschlüsselung (tools/encrypt_hidden.py)
#   hidden-src/preview.html  – eigenständige Vorschau zum Öffnen im Browser / RStudio-Viewer
# Erwartet `pcb_out` und `ringing_out` aus 02_pcb.R und 03_ringing.R.

source("R/00_setup.R")

notes <- c(
  "Werte immer als Summe 6 iPCB in ng/g Fett. Die Spalten «Frischgewicht» sind zwischen den Chargen nicht einheitlich (mal ng/g, mal pg/g) und werden darum nicht gezeigt.",
  "Hohle Punkte: Fischlaich 2025 sowie Köcherfliegen und Spinnen vom Oktober 2025 haben identische Fett- und Frischgewicht-Werte und einen Fettanteil von 0. Ob diese Werte auf Fett bezogen sind, ist bei der EMPA zu klären.",
  "Blindwerte sind ausgeblendet. Der Blindwert 51126 (Spinnen &amp; Köcherfliegen 2026) hat eine Summe von über 82'000 ng/g Fett und ist vermutlich falsch erfasst.",
  "Zwei Proben haben laut EMPA eine «sehr schlechte Wiederfindung» (Köcherfliegen Praspöl, grosse Radnetzspinnen Unterer Spöl).",
  "Altersklassen beim Beringen sind uneinheitlich erfasst (adult/adu/1y/nestling, 0/1/2/2+/3); «Diesjährig» = Jungvogel im ersten Jahr, nicht am Nest beringt.",
  sprintf("%d beringte Vögel haben keine Koordinaten und fehlen auf der Karte.", ringing_out$missing_coords)
)

data <- list(
  generated = format(Sys.Date()),
  pcb = pcb_out,
  ringing = ringing_out,
  notes = notes
)
json <- toJSON(data, dataframe = "rows", auto_unbox = TRUE, na = "null", null = "null", digits = NA)

read_txt <- function(f) paste(readLines(file.path(dir_page, f), warn = FALSE, encoding = "UTF-8"), collapse = "\n")
write_utf8 <- function(x, f) {
  con <- file(f, open = "w", encoding = "UTF-8")
  on.exit(close(con))
  writeLines(enc2utf8(x), con)
}

# Inhalt der versteckten Seite: Bibliotheken lädt cinclus.qmd, hier nur Stil, Markup, Daten, Code
inhalt <- paste0(
  "<style>\n", read_txt("page.css"), "\n</style>\n",
  read_txt("template.html"), "\n",
  "<script>window.CINCLUS_DATA = ", json, ";</script>\n",
  "<script>\n", read_txt("page.js"), "\n</script>\n"
)
write_utf8(inhalt, file.path(dir_out, "inhalt.html"))

# Vorschau mit denselben Bibliotheken wie auf der Website
libs <- c(
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.16/dist/plot.umd.min.js"></script>'
)
preview <- paste0(
  '<!doctype html>\n<html lang="de"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  "<title>Cinclus – Vorschau</title>\n", paste(libs, collapse = "\n"),
  "\n<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 16px;",
  "background:#fcfcfb;color:#0b0b0b}</style>\n</head><body>\n<h1>Cinclus</h1>\n",
  inhalt, "</body></html>\n"
)
write_utf8(preview, file.path(dir_out, "preview.html"))

message("Geschrieben: ", normalizePath(file.path(dir_out, "inhalt.html")), " und preview.html")
