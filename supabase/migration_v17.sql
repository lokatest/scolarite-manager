-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v17
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
--
-- Ajoute la journalisation des VISITES du site (y compris par des
-- personnes non connectées), dans le journal d'activité existant.
--
-- Migration ADDITIVE et NON DESTRUCTIVE : aucune donnée existante n'est
-- modifiée ni supprimée. Les anciennes entrées auront simplement les
-- nouvelles colonnes à NULL.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Autoriser le nouveau type d'événement "visite"
--    La contrainte actuelle n'accepte que connexion / deconnexion /
--    action : toute insertion "visite" serait rejetée par la base.
-- ---------------------------------------------------------------------
alter table public.activity_logs
  drop constraint if exists activity_logs_event_type_check;

alter table public.activity_logs
  add constraint activity_logs_event_type_check
  check (event_type in ('connexion', 'deconnexion', 'action', 'visite'));

-- ---------------------------------------------------------------------
-- 2) Nouvelles colonnes : page visitée et provenance
-- ---------------------------------------------------------------------
alter table public.activity_logs
  add column if not exists path text;

alter table public.activity_logs
  add column if not exists referrer text;

comment on column public.activity_logs.path is
  'Chemin de la page visitée (ex: /login). Renseigné pour les événements de type "visite".';
comment on column public.activity_logs.referrer is
  'Provenance du visiteur (moteur de recherche, lien externe...). NULL si accès direct.';

-- ---------------------------------------------------------------------
-- 3) Index dédié à la purge automatique des visites
--    Accélère la suppression quotidienne des visites anciennes.
-- ---------------------------------------------------------------------
create index if not exists idx_activity_logs_visite_purge
  on public.activity_logs (created_at)
  where event_type = 'visite';

-- ---------------------------------------------------------------------
-- 4) Fonction de purge : supprime les visites de plus de 30 jours
--
--    Seules les VISITES sont purgées. Les connexions, déconnexions et
--    actions sont conservées indéfiniment : ce sont les traces de
--    sécurité importantes, et leur volume reste faible.
--
--    Appelée une fois par jour par la tâche planifiée /api/keep-alive.
-- ---------------------------------------------------------------------
create or replace function public.purge_old_visit_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.activity_logs
  where event_type = 'visite'
    and created_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_old_visit_logs() is
  'Supprime les journaux de visite de plus de 30 jours. Les connexions, déconnexions et actions ne sont jamais purgées.';

-- La fonction est appelée exclusivement côté serveur avec la clé de
-- service ; on retire l'accès au rôle public par précaution.
revoke all on function public.purge_old_visit_logs() from public;
revoke all on function public.purge_old_visit_logs() from anon;

-- =====================================================================
-- FIN de la migration v17
-- =====================================================================
