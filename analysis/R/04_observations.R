# Beobachtungen pro Transekt und Monat (Ablesungen, Fänge, Beringungen, unberingte Vögel).
# Ergebnis: Liste `obs_out`.

source("R/00_setup.R")

obs_raw <- read_csv(file.path(dir_raw, "observations.csv"), show_col_types = FALSE)
transects_raw <- read_csv(file.path(dir_raw, "transects.csv"), show_col_types = FALSE)

# «SP01- PuntDalGall - 39» -> «SP01 PuntDalGall»
short_name <- function(code, name) paste(code, sub("\\s*-\\s*\\d+$", "", sub("^\\S+?\\s*-\\s*", "", name)))

obs <- obs_raw |>
  mutate(
    kind = case_when(
      action == "ringing" ~ "Beringung",
      action == "catch" ~ "Fang",
      is.na(individual_id) ~ "unberingt",
      action == "maybe" ~ "Ablesung unsicher",
      TRUE ~ "Ablesung"
    ),
    month = format(date, "%Y-%m"),
    transect = short_name(transect_code, transect)
  ) |>
  left_join(rivers, by = c("river_code" = "river"))

# Nur Spöl und Rom; andere Gewässer (Brenno, Zuflüsse) und Einträge ohne Transekt werden gezählt, nicht gezeigt.
obs_show <- obs |> filter(river_code %in% c("SP", "US", "RO"), grepl("^(SP|US|RO)", transect_code))
not_shown <- obs |> anti_join(obs_show, by = "observation_id") |>
  count(where = coalesce(transect, "ohne Transekt"))

by_cell <- obs_show |>
  group_by(river = river_code, river_label, transect_code, transect, transect_order, km = distance_from_pdg_m / 1000, month) |>
  summarise(
    n = n(),
    birds = n_distinct(individual_id, na.rm = TRUE),
    ringing = sum(kind == "Beringung"),
    catch = sum(kind == "Fang"),
    resight = sum(kind %in% c("Ablesung", "Ablesung unsicher")),
    unringed = sum(kind == "unberingt"),
    .groups = "drop"
  ) |>
  arrange(match(river, rivers$river), transect_order, month)

months <- format(seq(as.Date(paste0(min(obs_show$month), "-01")),
                     as.Date(paste0(max(obs_show$month), "-01")), by = "month"), "%Y-%m")

# Alle Transekte als Spalten, auch ohne Beobachtungen: SP01–10, US01–10, RO01–10
transects <- transects_raw |>
  mutate(river = river_code, transect = short_name(transect_code, transect),
         n = coalesce(as.integer(table(obs_show$transect_code)[transect_code]), 0L)) |>
  arrange(match(river, c("SP", "US", "RO")), transect_order) |>
  select(river, transect_code, transect, n)

obs_out <- list(cells = by_cell, transects = transects, months = months, not_shown = not_shown, total = nrow(obs))

message("Beobachtungen: ", nrow(obs_show), " von ", nrow(obs), " gezeigt; nicht gezeigt: ",
        paste(not_shown$where, not_shown$n, sep = " = ", collapse = ", "))
