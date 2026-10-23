-- Beringte Wasseramseln mit Ort (Nest oder Transekt), Gewässer und Distanz ab Punt dal Gall.
-- Basis ist die View v_individual_location; Ringnummern werden bewusst nicht geholt.
select
  v.individual_id,
  v.name,
  v.ringed_date,
  v.river_code,
  v.location_source,
  coalesce(v.transect_display_name, v.transect_code) as transect,
  v.nest_display_name,
  round(v.latitude::numeric, 5)  as lat,
  round(v.longitude::numeric, 5) as lon,
  v.distance_from_pdg_m,
  v.ringed_as,
  i.age_at_ringing,
  sx.code as sex
from public.v_individual_location v
join public.individual i          on i.id = v.individual_id
left join ref.sex_categories sx   on sx.id = i.sex_id
order by v.ringed_date
