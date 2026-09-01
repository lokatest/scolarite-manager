-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v6
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Rend le template du reçu de paiement éditable depuis l'interface,
-- par l'administrateur, sans dépendre d'un développeur.
-- =====================================================================

create table if not exists public.receipt_templates (
  id text primary key default 'default',
  html_content text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

comment on table public.receipt_templates is 'Contenu HTML éditable du template de reçu de paiement (une seule ligne active, id = ''default'')';

alter table public.receipt_templates enable row level security;

-- Tout utilisateur actif peut lire le template (nécessaire pour la génération du reçu)
drop policy if exists "receipt_templates_select_active_users" on public.receipt_templates;
create policy "receipt_templates_select_active_users"
  on public.receipt_templates for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

-- Seul l'admin peut créer/modifier le template
drop policy if exists "receipt_templates_upsert_admin_only" on public.receipt_templates;
create policy "receipt_templates_upsert_admin_only"
  on public.receipt_templates for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "receipt_templates_update_admin_only" on public.receipt_templates;
create policy "receipt_templates_update_admin_only"
  on public.receipt_templates for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- FIN de la migration v6
-- =====================================================================
