-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v10
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute le suivi détaillé de la génération du reçu (pour permettre les
-- tentatives automatiques en arrière-plan, sans bloquer la validation).
-- =====================================================================

alter table public.payment_requests
  add column if not exists receipt_status text not null default 'none'
    check (receipt_status in ('none', 'pending', 'success', 'failed')),
  add column if not exists receipt_attempts integer not null default 0,
  add column if not exists receipt_last_error text,
  add column if not exists receipt_task_server text,
  add column if not exists receipt_task_id text;

comment on column public.payment_requests.receipt_status is
  'Statut de la génération du reçu : none (pas encore tentée), pending (en cours), success, failed (après épuisement des tentatives)';

create index if not exists idx_payment_requests_receipt_status
  on public.payment_requests (receipt_status)
  where receipt_status in ('pending', 'failed');

-- =====================================================================
-- FIN de la migration v10
-- =====================================================================
