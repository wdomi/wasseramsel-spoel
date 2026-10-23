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
  sx.code as sex,
  rlt.code as ring_l_top,      -- Farbringe als Kürzel (alu, yel, bla …), links/rechts aus Sicht des Vogels
  rlb.code as ring_l_bottom,
  rrt.code as ring_r_top,
  rrb.code as ring_r_bottom
from public.v_individual_location v
join public.individual i          on i.id = v.individual_id
left join ref.sex_categories sx   on sx.id = i.sex_id
left join ref.rings rlt           on rlt.id = i."ring_L_t"
left join ref.rings rlb           on rlb.id = i."ring_L_b"
left join ref.rings rrt           on rrt.id = i."ring_R_t"
left join ref.rings rrb           on rrb.id = i."ring_R_b"
order by v.ringed_date
