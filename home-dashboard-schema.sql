-- ============================================================
--  HOME DASHBOARD — guarda la ultima direccion/score analizados
--  Corre esto UNA vez en el SQL Editor de tu proyecto de Supabase,
--  despues de location-data-schema.sql.
--
--  Le da a cada sitio 3 columnas nuevas para que la pantalla de
--  Home pueda mostrar "tu ultimo analisis" sin tener que volver a
--  calcularlo. Se llenan solas la proxima vez que uses Location
--  Intelligence — no hace falta nada mas de tu parte.
-- ============================================================

alter table public.tryla_sites add column if not exists li_last_address text;
alter table public.tryla_sites add column if not exists li_last_score numeric;
alter table public.tryla_sites add column if not exists li_last_real boolean;
