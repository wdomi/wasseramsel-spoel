-- Alle Beobachtungen von Wasseramseln (Ablesungen, Fänge, Beringungen) mit Transekt.
-- Beringungen am Nest haben kein Transekt; dort gilt das Transekt des Nests (site).
select
  o.id                as observation_id,
  o.date,
  o.action,
  o.individual_id,
  r.code              as river_code,
  t.transect_code,
  t.display_name      as transect,
  t.transect_order,
  t.distance_from_pdg_m
from public.ind_observation o
left join public.site s       on s.id = o.nest_id
left join ref.transects t     on t.id = coalesce(o.transect_id, s.transect_id)
left join ref.rivers r        on r.id = t.river_id
where not coalesce(o.deleted, false)
order by o.date
