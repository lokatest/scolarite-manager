-- =====================================================================
-- SCOLARITÉ MANAGER — Migration v18
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois)
--
-- Rend le numéro de reçu ECOBANK UNIQUE : deux demandes de paiement ne
-- peuvent plus porter le même numéro de reçu.
--
-- La vérification est aussi faite côté application (message clair pour
-- l'utilisateur), mais la contrainte ci-dessous est la garantie réelle :
-- elle s'applique quel que soit le chemin emprunté, y compris si deux
-- demandes identiques sont envoyées exactement au même instant.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Contrôle préalable : y a-t-il déjà des doublons en base ?
--
--    Si oui, la création de la contrainte échouerait avec un message
--    technique peu lisible. Ce bloc interrompt donc la migration avec
--    une explication claire et la marche à suivre.
-- ---------------------------------------------------------------------
do $$
declare
  nb_doublons integer;
  exemples text;
begin
  select count(*), string_agg(recu_ecobank, ', ')
    into nb_doublons, exemples
  from (
    select recu_ecobank
    from public.payment_requests
    where recu_ecobank is not null
      and trim(recu_ecobank) <> ''
    group by recu_ecobank
    having count(*) > 1
    limit 10
  ) doublons;

  if nb_doublons > 0 then
    raise exception E'MIGRATION INTERROMPUE — % numero(s) de recu ECOBANK en double dans la base.\n\nNumeros concernes : %\n\nPour les identifier precisement, executez :\n  select recu_ecobank, count(*), array_agg(id) as demandes\n  from public.payment_requests\n  where recu_ecobank is not null and trim(recu_ecobank) <> %L\n  group by recu_ecobank having count(*) > 1;\n\nCorrigez ou supprimez les demandes concernees, puis relancez cette migration.',
      nb_doublons, exemples, '';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) Contrainte d'unicité
--
--    Index partiel : les valeurs vides ou absentes sont ignorées, afin
--    de ne pas bloquer les anciennes demandes créées avant l'ajout de
--    ce champ (migration v4).
-- ---------------------------------------------------------------------
create unique index if not exists idx_payment_requests_recu_ecobank_unique
  on public.payment_requests (recu_ecobank)
  where recu_ecobank is not null and trim(recu_ecobank) <> '';

comment on index public.idx_payment_requests_recu_ecobank_unique is
  'Garantit qu''un même numéro de reçu ECOBANK ne peut être rattaché qu''à une seule demande de paiement.';

-- =====================================================================
-- FIN de la migration v18
-- =====================================================================
