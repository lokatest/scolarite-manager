-- =====================================================================
-- SCOLARITÉ MANAGER — Schéma de base de données Supabase
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- =====================================================================

-- 1) EXTENSION nécessaire pour générer des UUID
create extension if not exists "pgcrypto";

-- =====================================================================
-- 2) TABLE : profiles (utilisateurs de l'application)
--    Étend auth.users avec un rôle métier : admin | user
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Comptes utilisateurs de la plateforme (admin ou gestionnaire)';

-- Fonction utilitaire : le user courant est-il admin ?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- =====================================================================
-- 3) TABLE : students (étudiants)
-- =====================================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  matricule text not null unique,
  full_name text not null,
  filiere text not null,
  niveau text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

comment on table public.students is 'Fiches étudiants de l''établissement';

-- Index de recherche rapide par nom / matricule
create index if not exists idx_students_matricule on public.students (matricule);
create index if not exists idx_students_full_name on public.students using gin (to_tsvector('french', full_name));

-- =====================================================================
-- 4) TABLE : payment_requests (demandes de paiement)
-- =====================================================================
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  motif text,
  status text not null default 'en_attente' check (status in ('en_attente', 'validee', 'rejetee')),
  requested_by uuid references public.profiles(id),
  requested_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz
);

comment on table public.payment_requests is 'Demandes de paiement liées à un étudiant, en attente de validation admin';

create index if not exists idx_payment_requests_student on public.payment_requests (student_id);
create index if not exists idx_payment_requests_status on public.payment_requests (status);
create index if not exists idx_payment_requests_requested_at on public.payment_requests (requested_at desc);

-- =====================================================================
-- 5) TRIGGER : création automatique du profil à l'inscription
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    -- Le tout premier utilisateur inscrit devient automatiquement admin
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'user' end,
    -- Les nouveaux comptes (hors tout premier) sont inactifs tant qu'un admin ne les valide pas
    case when (select count(*) from public.profiles) = 0 then true else false end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 6) ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.payment_requests enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- students ----
drop policy if exists "students_select_active_users" on public.students;
create policy "students_select_active_users"
  on public.students for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

drop policy if exists "students_insert_active_users" on public.students;
create policy "students_insert_active_users"
  on public.students for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

drop policy if exists "students_update_admin_only" on public.students;
create policy "students_update_admin_only"
  on public.students for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "students_delete_admin_only" on public.students;
create policy "students_delete_admin_only"
  on public.students for delete
  to authenticated
  using (public.is_admin());

-- ---- payment_requests ----
drop policy if exists "payment_requests_select_active_users" on public.payment_requests;
create policy "payment_requests_select_active_users"
  on public.payment_requests for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

drop policy if exists "payment_requests_insert_active_users" on public.payment_requests;
create policy "payment_requests_insert_active_users"
  on public.payment_requests for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and requested_by = auth.uid()
    and status = 'en_attente'
  );

-- Seul l'admin peut modifier (valider / rejeter) une demande
drop policy if exists "payment_requests_update_admin_only" on public.payment_requests;
create policy "payment_requests_update_admin_only"
  on public.payment_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- FIN — Après exécution : créez votre 1er compte via la page /signup
-- de l'application. Il deviendra automatiquement administrateur.
-- =====================================================================
