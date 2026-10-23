# Beringungen: Altersklasse vereinheitlichen, Testeinträge entfernen, nach Abschnitt zusammenfassen.
# Ergebnis: Liste `ringing_out`.

source("R/00_setup.R")

ring_raw <- read_csv(file.path(dir_raw, "ringing.csv"), show_col_types = FALSE,
                     col_types = cols(age_at_ringing = col_character()))

# ringed_as und age_at_ringing sind uneinheitlich erfasst (adult/adu/1y/nestling, 0/1/2/2+/3/1?).
age_class <- function(ringed_as, age, nest) {
  ra <- tolower(coalesce(ringed_as, ""))
  case_when(
    ra == "nestling" ~ "Nestling",
    ra == "1y" | age %in% c("0", "1", "1?") & is.na(nest) ~ "Diesjährig",
    ra %in% c("adult", "adu") | age %in% c("2", "2+", "3", "Adult") ~ "Adult",
    age == "0" ~ "Nestling",
    TRUE ~ "Unbekannt"
  )
}

ringing <- ring_raw |>
  filter(!is.na(ringed_date), ringed_date > as.Date("2020-01-01")) |>   # Testeintrag 2000-01-01
  mutate(
    age_class = age_class(ringed_as, age_at_ringing, nest_display_name),
    year = as.integer(format(ringed_date, "%Y")),
    season = ifelse(as.integer(format(ringed_date, "%m")) <= 7, "Brutzeit", "Herbst"),
    km = round(distance_from_pdg_m / 1000, 2),
    place = coalesce(nest_display_name, transect)
  ) |>
  left_join(rivers, by = c("river_code" = "river")) |>
  transmute(id = individual_id, name, date = as.character(ringed_date), year, season,
            river = river_code, river_label, age_class, sex, km, lat, lon, place, location_source)

by_section <- ringing |>
  count(river, river_label, year, age_class, name = "n") |>
  arrange(river, year)

ringing_out <- list(
  birds = ringing,
  by_section = by_section,
  missing_coords = sum(is.na(ringing$lat))
)

message("Beringungen: ", nrow(ringing), " Vögel; ohne Koordinaten: ", ringing_out$missing_coords)
