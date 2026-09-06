-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v13
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Ajoute le numéro de téléphone, nécessaire pour les notifications SMS
-- (Africa's Talking) lors de l'initiation et de la validation d'une
-- demande de paiement.
-- =====================================================================

alter table public.profiles
  add column if not exists phone_number text;

comment on column public.profiles.phone_number is
  'Numéro de téléphone au format international (ex: +237650000000), utilisé pour les notifications SMS';

-- =====================================================================
-- FIN de la migration v13
-- =====================================================================
