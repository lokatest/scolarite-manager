-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v2
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute : statut "Terminé", édition/suppression des demandes,
-- upload de preuves de paiement (images)
-- =====================================================================

-- =====================================================================
-- 1) Nouveau statut "terminee" + colonnes de traçabilité
-- =====================================================================
alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;

alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('en_attente', 'validee', 'rejetee', 'terminee'));

alter table public.payment_requests
  add column if not exists terminee_by uuid references public.profiles(id),
  add column if not exists terminee_at timestamptz;

-- =====================================================================
-- 2) Table des preuves de paiement (images/captures)
-- =====================================================================
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

comment on table public.payment_proofs is 'Captures/preuves de paiement liées à une demande, visibles uniquement par admin et gestionnaires';

create index if not exists idx_payment_proofs_request on public.payment_proofs (payment_request_id);

alter table public.payment_proofs enable row level security;

drop policy if exists "payment_proofs_select_active_users" on public.payment_proofs;
create policy "payment_proofs_select_active_users"
  on public.payment_proofs for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

drop policy if exists "payment_proofs_insert_active_users" on public.payment_proofs;
create policy "payment_proofs_insert_active_users"
  on public.payment_proofs for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and uploaded_by = auth.uid()
  );

-- =====================================================================
-- 3) Bucket de stockage privé pour les preuves de paiement
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "payment_proofs_storage_select" on storage.objects;
create policy "payment_proofs_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "payment_proofs_storage_insert" on storage.objects;
create policy "payment_proofs_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "payment_proofs_storage_delete" on storage.objects;
create policy "payment_proofs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_admin()
  );

-- =====================================================================
-- 4) Mise à jour des policies de payment_requests
--    - Édition (update) : autorisée à tout utilisateur actif SI la ligne
--      qu'il modifie est encore "en_attente" (avant modif) ; l'admin garde
--      un accès total (validation, passage à rejetee/terminee, etc.)
--    - Suppression (delete) :
--        * "en_attente" -> tout utilisateur actif
--        * "validee" / "terminee" -> admin uniquement
--        * "rejetee" -> personne (aucune policy = refus)
-- =====================================================================
drop policy if exists "payment_requests_update_admin_only" on public.payment_requests;

-- Un utilisateur actif peut modifier une ligne tant qu'elle est en_attente
drop policy if exists "payment_requests_update_pending_by_active_users" on public.payment_requests;
create policy "payment_requests_update_pending_by_active_users"
  on public.payment_requests for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and status = 'en_attente'
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- L'admin peut tout modifier, quel que soit le statut (validation, rejet...)
drop policy if exists "payment_requests_update_admin_full" on public.payment_requests;
create policy "payment_requests_update_admin_full"
  on public.payment_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Un gestionnaire (non-admin) peut marquer "terminee" une demande "validee"
drop policy if exists "payment_requests_update_terminee_by_user" on public.payment_requests;
create policy "payment_requests_update_terminee_by_user"
  on public.payment_requests for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'user')
    and status = 'validee'
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'user')
    and status = 'terminee'
  );

-- Suppression : en_attente -> tout utilisateur actif
drop policy if exists "payment_requests_delete_pending_by_active_users" on public.payment_requests;
create policy "payment_requests_delete_pending_by_active_users"
  on public.payment_requests for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and status = 'en_attente'
  );

-- Suppression : validee / terminee -> admin uniquement
drop policy if exists "payment_requests_delete_resolved_by_admin" on public.payment_requests;
create policy "payment_requests_delete_resolved_by_admin"
  on public.payment_requests for delete
  to authenticated
  using (
    public.is_admin()
    and status in ('validee', 'terminee')
  );

-- =====================================================================
-- FIN de la migration v2
-- =====================================================================
