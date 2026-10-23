# Ganze Kette: Datenbank -> Aufbereitung -> Seite -> (optional) verschlüsseln.
# In RStudio: analysis/analysis.Rproj öffnen und dieses Skript mit «Source» ausführen.
# In VS Code / Terminal: im Ordner analysis/  ->  Rscript run_all.R

fetch_from_db <- TRUE    # FALSE: vorhandene CSV in data-raw/ verwenden
encrypt       <- FALSE   # TRUE: assets/cinclus-vault.json neu schreiben (fragt nach dem Stichwort)

if (fetch_from_db) source("R/01_fetch.R")
source("R/02_pcb.R")
source("R/03_ringing.R")
source("R/04_build_page.R")

if (interactive()) utils::browseURL(normalizePath("../hidden-src/preview.html"))

if (encrypt) {
  pw <- Sys.getenv("VAULT_PASSWORD")
  if (pw == "" && requireNamespace("rstudioapi", quietly = TRUE) && rstudioapi::isAvailable()) {
    pw <- rstudioapi::askForPassword("Stichwort der versteckten Seite")
  }
  if (pw == "") stop("Stichwort fehlt: VAULT_PASSWORD setzen oder in RStudio ausführen.")
  py <- if (nzchar(Sys.which("python3"))) "python3" else "python"
  status <- system2(py, c("../tools/encrypt_hidden.py", "../hidden-src/inhalt.html"), env = paste0("VAULT_PASSWORD=", shQuote(pw)))
  if (status != 0) stop("Verschlüsseln fehlgeschlagen (pip install cryptography?)")
  message("Jetzt assets/cinclus-vault.json committen.")
}
