# Holt die Rohdaten aus der Cinclopedia-Datenbank (Supabase, Postgres) und speichert sie als CSV.
# Nur lesend. Verbindung über SUPABASE_DB_URL in .Renviron (siehe .Renviron.example).
# Ohne Verbindung: die CSV in data-raw/ von Hand ablegen, die weiteren Skripte laufen trotzdem.

source("R/00_setup.R")

db_url <- Sys.getenv("SUPABASE_DB_URL")
if (db_url == "") stop("SUPABASE_DB_URL fehlt. .Renviron.example nach .Renviron kopieren und ausfüllen, dann R neu starten.")

con <- DBI::dbConnect(RPostgres::Postgres(), dbname = db_url)
on.exit(DBI::dbDisconnect(con), add = TRUE)

fetch <- function(name) {
  sql <- paste(readLines(file.path("sql", paste0(name, ".sql")), warn = FALSE), collapse = "\n")
  df  <- DBI::dbGetQuery(con, sql)
  write_csv(df, file.path(dir_raw, paste0(name, ".csv")), na = "")
  message(name, ": ", nrow(df), " Zeilen")
}

fetch("pcb")
fetch("ringing")
fetch("observations")
fetch("transects")
