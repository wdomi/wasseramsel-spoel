# Beobachtungen pro Transekt und Monat (Ablesungen, Fänge, Beringungen, unberingte Vögel).
# Ergebnis: Liste `obs_out`.

source("R/00_setup.R")

obs_raw <- read_csv(file.path(dir_raw, "observations.csv"), show_col_types = FALSE)

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
    # «SP01- PuntDalGall - 39» -> «SP01 PuntDalGall»
    transect = paste(transect_code, sub("\\s*-\\s*\\d+$", "", sub("^\\S+?\\s*-\\s*", "", transect)))
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

obs_out <- list(cells = by_cell, months = months, not_shown = not_shown, total = nrow(obs))

message("Beobachtungen: ", nrow(obs_show), " von ", nrow(obs), " gezeigt; nicht gezeigt: ",
        paste(not_shown$where, not_shown$n, sep = " = ", collapse = ", "))
