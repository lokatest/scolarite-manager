-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v5
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute le système de reçu de paiement (génération automatique à la
-- validation, téléchargeable une fois la demande "Terminée")
-- =====================================================================

alter table public.payment_requests
  add column if not exists receipt_path text,
  add column if not exists receipt_reference text;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_storage_select" on storage.objects;
create policy "receipts_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "receipts_storage_insert" on storage.objects;
create policy "receipts_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- =====================================================================
-- FIN de la migration v5
-- =====================================================================
