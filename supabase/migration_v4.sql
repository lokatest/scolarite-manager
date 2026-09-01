-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v4
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- - L'admin peut aussi supprimer les demandes rejetées
-- - Ajout du numéro de reçu ECOBANK sur les demandes de paiement
-- =====================================================================

-- 1) Nouveau champ : numéro de reçu ECOBANK
alter table public.payment_requests
  add column if not exists recu_ecobank text;

-- 2) L'admin peut désormais supprimer une demande quel que soit son statut
--    (en_attente reste ouvert à tout utilisateur actif via l'autre policy)
drop policy if exists "payment_requests_delete_resolved_by_admin" on public.payment_requests;
create policy "payment_requests_delete_resolved_by_admin"
  on public.payment_requests for delete
  to authenticated
  using (
    public.is_admin()
    and status in ('validee', 'terminee', 'rejetee')
  );

-- =====================================================================
-- FIN de la migration v4
-- =====================================================================
