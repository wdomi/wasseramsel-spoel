-- Alle Transekte von Spöl und Rom, auch solche ohne Beobachtungen.
select
  t.transect_code,
  t.display_name      as transect,
  t.transect_order,
  t.distance_from_pdg_m,
  r.code              as river_code
from ref.transects t
left join ref.rivers r on r.id = t.river_id
where t.transect_code ~ '^(SP|US|RO)'
order by t.transect_code
