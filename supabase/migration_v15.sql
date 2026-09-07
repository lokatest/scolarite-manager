-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v15
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute le journal d'activité : connexions/déconnexions et actions
-- effectuées, classifiées par utilisateur. Réservé aux administrateurs.
-- =====================================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  event_type text not null check (event_type in ('connexion', 'deconnexion', 'action')),
  detail text not null,
  ip text,
  city text,
  country text,
  device text,
  os text,
  browser text,
  created_at timestamptz not null default now()
);

comment on table public.activity_logs is
  'Journal des connexions/déconnexions et des actions effectuées, réservé à la consultation par les administrateurs. Écrit exclusivement via la clé de service.';

create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_user on public.activity_logs (user_id);
create index if not exists idx_activity_logs_type on public.activity_logs (event_type);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select_admin_only" on public.activity_logs;
create policy "activity_logs_select_admin_only"
  on public.activity_logs for select
  to authenticated
  using (public.is_admin());

-- Aucune policy d'écriture : les entrées sont créées exclusivement via
-- la clé de service (contexte serveur de confiance), jamais côté client.

-- =====================================================================
-- FIN de la migration v15
-- =====================================================================
