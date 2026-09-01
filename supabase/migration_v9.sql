-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v9
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- - Ajoute le module "Réclamations"
-- - Permet aux gestionnaires de modifier matricule/filière d'un étudiant
-- =====================================================================

-- =====================================================================
-- 1) Table des réclamations
-- =====================================================================
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'en_attente' check (status in ('en_attente', 'validee', 'rejetee')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz
);

comment on table public.claims is 'Réclamations et demandes de modification créées par les gestionnaires, traitées par les administrateurs';

create index if not exists idx_claims_status on public.claims (status);
create index if not exists idx_claims_created_at on public.claims (created_at desc);

alter table public.claims enable row level security;

drop policy if exists "claims_select_active_users" on public.claims;
create policy "claims_select_active_users"
  on public.claims for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

-- Seuls les gestionnaires (role = 'user') peuvent créer une réclamation
drop policy if exists "claims_insert_by_gestionnaires" on public.claims;
create policy "claims_insert_by_gestionnaires"
  on public.claims for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active and p.role = 'user'
    )
    and created_by = auth.uid()
    and status = 'en_attente'
  );

-- Un gestionnaire actif peut modifier une réclamation tant qu'elle est en_attente
drop policy if exists "claims_update_pending_by_gestionnaires" on public.claims;
create policy "claims_update_pending_by_gestionnaires"
  on public.claims for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active and p.role = 'user'
    )
    and status = 'en_attente'
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active and p.role = 'user'
    )
  );

-- L'admin peut tout modifier (valider, rejeter...), quel que soit le statut
drop policy if exists "claims_update_admin_full" on public.claims;
create policy "claims_update_admin_full"
  on public.claims for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Suppression : gestionnaire si en_attente, admin dans tous les cas
drop policy if exists "claims_delete_pending_by_gestionnaires" on public.claims;
create policy "claims_delete_pending_by_gestionnaires"
  on public.claims for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active and p.role = 'user'
    )
    and status = 'en_attente'
  );

drop policy if exists "claims_delete_admin_full" on public.claims;
create policy "claims_delete_admin_full"
  on public.claims for delete
  to authenticated
  using (public.is_admin());

-- =====================================================================
-- 2) Photos jointes à une réclamation (plusieurs autorisées)
-- =====================================================================
create table if not exists public.claim_photos (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_claim_photos_claim on public.claim_photos (claim_id);

alter table public.claim_photos enable row level security;

drop policy if exists "claim_photos_select_active_users" on public.claim_photos;
create policy "claim_photos_select_active_users"
  on public.claim_photos for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

drop policy if exists "claim_photos_insert_active_users" on public.claim_photos;
create policy "claim_photos_insert_active_users"
  on public.claim_photos for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and uploaded_by = auth.uid()
  );

drop policy if exists "claim_photos_delete_active_users" on public.claim_photos;
create policy "claim_photos_delete_active_users"
  on public.claim_photos for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

-- =====================================================================
-- 3) Bucket de stockage pour les photos de réclamation
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('claim-photos', 'claim-photos', false)
on conflict (id) do nothing;

drop policy if exists "claim_photos_storage_select" on storage.objects;
create policy "claim_photos_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'claim-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "claim_photos_storage_insert" on storage.objects;
create policy "claim_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'claim-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "claim_photos_storage_delete" on storage.objects;
create policy "claim_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'claim-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- =====================================================================
-- 4) Les gestionnaires peuvent modifier un étudiant (matricule/filière
--    uniquement, restriction appliquée côté application, pas en RLS
--    car PostgreSQL ne restreint pas facilement au niveau colonne ici)
-- =====================================================================
drop policy if exists "students_update_active_users" on public.students;
create policy "students_update_active_users"
  on public.students for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

-- =====================================================================
-- FIN de la migration v9
-- =====================================================================
