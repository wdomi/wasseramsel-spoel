# PCB: Proben gruppieren, Blindwerte und unsichere Werte markieren, Kennzahlen berechnen.
# Ergebnis: Liste `pcb_out` (wird in 04_build_page.R als JSON in die Seite geschrieben).

source("R/00_setup.R")

pcb_raw <- read_csv(file.path(dir_raw, "pcb.csv"), show_col_types = FALSE,
                    col_types = cols(empa_id = col_character(), river = col_character()))

# Probentyp -> Gruppe für die Seite (Reihenfolge = Nahrungskette von unten nach oben)
groups <- tibble::tribble(
  ~sample_type,  ~group,              ~group_order,
  "inv_gamma",   "Makrozoobenthos",   1,
  "inv_caddis",  "Makrozoobenthos",   1,
  "inv_spiders", "Ufer-Spinnen",      2,
  "sprawn",      "Fischlaich",        3,
  "fish",        "Fische",            4,
  "egg",         "Wasseramsel-Eier",  5
)

pcb <- pcb_raw |>
  mutate(
    is_blank = grepl("blind", paste(shortname, display_name, remark), ignore.case = TRUE),
    # Bei einigen Chargen sind Fett- und Frischgewicht-Wert identisch und der Fettanteil 0:
    # dort ist unklar, ob der Wert wirklich auf Fett bezogen ist.
    unit_uncertain = !is.na(sum_6_ipcb_fresh) & abs(sum_6_ipcb_fat - sum_6_ipcb_fresh) < 0.01,
    poor_recovery = grepl("Wiederfindung", coalesce(remark, "")),
    year = as.integer(substr(date_collected, 1, 4)),
    label = coalesce(display_name, shortname)
  ) |>
  left_join(groups, by = "sample_type") |>
  left_join(rivers, by = "river")

# Was nicht auf die Seite kommt (wird unten mitgezählt, damit nichts stillschweigend fehlt)
dropped <- pcb |>
  mutate(reason = case_when(
    is_blank ~ "Blindwert",
    is.na(group) ~ paste("nicht gezeigt:", sample_type),
    is.na(sum_6_ipcb_fat) ~ "kein Wert",
    TRUE ~ NA_character_
  )) |>
  filter(!is.na(reason)) |>
  count(reason)

pcb_show <- pcb |>
  filter(!is_blank, !is.na(group), !is.na(sum_6_ipcb_fat)) |>
  transmute(
    id = sample_id, label, group, group_order, sample_type,
    taxon = name_de, river, river_label, river_role,
    date = as.character(date_collected), year,
    km = round(distance_from_pdg_m / 1000, 2),   # entlang Spöl ab Punt dal Gall; für Rom nicht sinnvoll
    lat, lon,
    value = round(sum_6_ipcb_fat, 1),          # Summe 6 iPCB, ng/g Fett
    factor = round(sum_6_ipcb_fat / limit_chicken_egg),
    dl = signif(sum_12_dlpcb_fat, 3),             # Summe 12 dl-PCB, ng/g Fett
    teq = signif(teq_fat_weight_ng_g, 3),
    unit_uncertain, poor_recovery
  ) |>
  arrange(group_order, river, date)

# Kennzahlen Wasseramsel-Eier pro Gewässer
egg_summary <- pcb_show |>
  filter(group == "Wasseramsel-Eier") |>
  group_by(river, river_label) |>
  summarise(n = n(), median = round(median(value)), min = round(min(value)),
            max = round(max(value)), median_factor = round(median(value) / limit_chicken_egg),
            .groups = "drop") |>
  arrange(match(river, rivers$river))

pcb_out <- list(
  limit = limit_chicken_egg,
  samples = pcb_show,
  egg_summary = egg_summary,
  dropped = dropped
)

message("PCB: ", nrow(pcb_show), " Proben gezeigt; weggelassen: ",
        paste(dropped$reason, dropped$n, sep = " = ", collapse = ", "))
