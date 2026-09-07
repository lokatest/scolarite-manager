-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v14
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute le suivi des tentatives de connexion échouées, pour limiter
-- les tentatives à 5 avant un blocage temporaire de 60 minutes.
-- =====================================================================

create table if not exists public.login_attempts (
  email text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.login_attempts is
  'Suivi des tentatives de connexion échouées, par email — aucune donnée sensible (pas de mot de passe). Accès exclusivement via la clé de service, jamais côté client.';

alter table public.login_attempts enable row level security;
-- Aucune policy créée volontairement : cette table n'est accessible
-- que via la clé de service (contexte serveur de confiance, avant même
-- qu'une session utilisateur existe) — RLS bloque donc tout accès direct
-- côté client ou avec la clé publique, ce qui est le comportement voulu.

-- =====================================================================
-- FIN de la migration v14
-- =====================================================================
