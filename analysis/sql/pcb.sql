-- PCB-Resultate (EMPA) mit Probe, Probentyp, Art und Gewässer.
-- Eine Zeile pro analysierte Probe. Blindwerte sind enthalten und werden in R markiert.
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
  p.empa_id,
  p.methode_type_empa,
  p.fat_to_sample_ratio,
  p.sum_6_ipcb_fat,
  p.sum_6_ipcb_fresh,
  p.teq_fat_weight_ng_g,
  p.factor_over_chicken_egg_40,
  p.remark
from public.pcb p
join public.sample s        on s.id = p.sample_id
left join ref.sample_types st on st.id = s.type
left join ref.species sp      on sp.id = s.species
order by st.code, s.date_collected
