-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v8
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
-- Permet la suppression effective des fichiers de stockage (preuves de
-- paiement, reçus PDF) quand une demande de paiement est supprimée.
-- =====================================================================

-- La suppression d'une demande de paiement (payment_requests) est déjà
-- autorisée selon des règles précises (en_attente -> tout utilisateur actif,
-- validee/terminee/rejetee -> admin uniquement). C'est CETTE règle qui fait
-- foi pour savoir "qui a le droit de supprimer quoi" : une fois qu'une
-- suppression de la ligne est acceptée, le nettoyage des fichiers associés
-- (qui ne peut être déclenché qu'après coup, par le serveur) doit pouvoir
-- s'exécuter avec le même utilisateur.

drop policy if exists "payment_proofs_storage_delete" on storage.objects;
create policy "payment_proofs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "receipts_storage_delete" on storage.objects;
create policy "receipts_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- =====================================================================
-- FIN de la migration v8
-- =====================================================================
