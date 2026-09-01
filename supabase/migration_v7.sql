-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v7
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Remplace l'éditeur HTML par le stockage du vrai fichier Word original
-- (mise en forme, images, positions... 100% préservées, conversion via
-- Adobe PDF Services)
-- =====================================================================

-- On repart sur une structure adaptée au nouveau système (fichier réel)
drop table if exists public.receipt_templates;

create table public.receipt_templates (
  id text primary key default 'default',
  docx_path text not null,
  original_filename text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

comment on table public.receipt_templates is 'Référence vers le fichier Word original utilisé comme template du reçu de paiement';

alter table public.receipt_templates enable row level security;

drop policy if exists "receipt_templates_select_active_users" on public.receipt_templates;
create policy "receipt_templates_select_active_users"
  on public.receipt_templates for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active));

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

-- Bucket de stockage pour les fichiers Word originaux du template
insert into storage.buckets (id, name, public)
values ('receipt-templates', 'receipt-templates', false)
on conflict (id) do nothing;

drop policy if exists "receipt_templates_storage_select" on storage.objects;
create policy "receipt_templates_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipt-templates'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "receipt_templates_storage_insert" on storage.objects;
create policy "receipt_templates_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipt-templates'
    and public.is_admin()
  );

drop policy if exists "receipt_templates_storage_update" on storage.objects;
create policy "receipt_templates_storage_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'receipt-templates' and public.is_admin())
  with check (bucket_id = 'receipt-templates' and public.is_admin());

-- =====================================================================
-- FIN de la migration v7
-- =====================================================================
