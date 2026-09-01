-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v3
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Active le temps réel (Realtime) pour que les listes se mettent à jour
-- automatiquement en arrière-plan, sans avoir besoin de F5.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'payment_requests'
  ) then
    alter publication supabase_realtime add table public.payment_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'payment_proofs'
  ) then
    alter publication supabase_realtime add table public.payment_proofs;
  end if;
end $$;

-- =====================================================================
-- FIN de la migration v3
-- =====================================================================
