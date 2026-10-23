-- PCB-Resultate (EMPA) mit Probe, Probentyp, Art und Gewässer.
-- Eine Zeile pro analysierte Probe. Blindwerte sind enthalten und werden in R markiert.
-- Distanz ab Punt dal Gall: vom Nest (Code am Anfang von display_name, z. B. «SP2402 - Wehr - …»),
-- sonst vom Transekt der Probe.
select
  s.id                 as sample_id,
  s.shortname,
  s.display_name,
  st.code              as sample_type,
  sp.name_lat,
  sp.name_de,
  nullif(s.river, '')  as river,
  s.date_collected,
  s.transect_id,
  round(s.latitude::numeric, 5)  as lat,
  round(s.longitude::numeric, 5) as lon,
  coalesce(si.distance_from_pdg_m, t.distance_from_pdg_m) as distance_from_pdg_m,
  p.empa_id,
  p.methode_type_empa,
  p.fat_to_sample_ratio,
  p.sum_6_ipcb_fat,
  p.sum_6_ipcb_fresh,
  -- Summe der 12 dioxinähnlichen PCB (ng/g Fett); leer, wenn kein Kongener gemessen wurde
  case when num_nonnulls(p.dlpcb77_ng_g_fat, p.dlpcb81_ng_g_fat, p.dlpcb105_ng_g_fat, p.dlpcb114_ng_g_fat, p.dlpcb118_ng_g_fat, p.dlpcb123_ng_g_fat, p.dlpcb126_ng_g_fat, p.dlpcb156_ng_g_fat, p.dlpcb157_ng_g_fat, p.dlpcb167_ng_g_fat, p.dlpcb169_ng_g_fat, p.dlpcb189_ng_g_fat) > 0
       then coalesce(p.dlpcb77_ng_g_fat, 0) + coalesce(p.dlpcb81_ng_g_fat, 0) + coalesce(p.dlpcb105_ng_g_fat, 0) + coalesce(p.dlpcb114_ng_g_fat, 0) + coalesce(p.dlpcb118_ng_g_fat, 0) + coalesce(p.dlpcb123_ng_g_fat, 0) + coalesce(p.dlpcb126_ng_g_fat, 0) + coalesce(p.dlpcb156_ng_g_fat, 0) + coalesce(p.dlpcb157_ng_g_fat, 0) + coalesce(p.dlpcb167_ng_g_fat, 0) + coalesce(p.dlpcb169_ng_g_fat, 0) + coalesce(p.dlpcb189_ng_g_fat, 0)
  end as sum_12_dlpcb_fat,
  p.teq_fat_weight_ng_g,
  p.factor_over_chicken_egg_40,
  p.remark
from public.pcb p
join public.sample s        on s.id = p.sample_id
left join ref.sample_types st on st.id = s.type
left join ref.species sp      on sp.id = s.species
left join public.site si      on si.site_code = split_part(s.display_name, ' ', 1)
left join ref.transects t     on t.id = s.transect_id
order by st.code, s.date_collected
