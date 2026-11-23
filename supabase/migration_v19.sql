-- =====================================================================
-- MIGRATION v19 — Les gestionnaires peuvent modifier le niveau
--
-- Jusqu'ici (migration v16), seul un administrateur pouvait modifier le
-- nom complet OU le niveau d'un étudiant. Désormais, le gestionnaire peut
-- aussi modifier le niveau (en plus du matricule et de la filière).
--
-- Le nom complet reste réservé à l'administrateur, toujours verrouillé
-- en base : même une requête fabriquée à la main ne peut pas le changer.
--
-- À exécuter une seule fois dans Supabase → SQL Editor. Sans danger si
-- elle est relancée : elle remplace simplement la fonction du trigger.
-- =====================================================================

create or replace function public.restrict_student_update_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role text;
begin
  select role into requester_role
  from public.profiles
  where id = auth.uid();

  if requester_role is distinct from 'admin' then
    if new.full_name is distinct from old.full_name then
      raise exception
        'Seul un administrateur peut modifier le nom complet d''un étudiant.';
    end if;
  end if;

  return new;
end;
$$;

-- Le trigger existant (trg_restrict_student_update_fields) pointe déjà sur
-- cette fonction : il est recréé ici uniquement pour garantir sa présence.
drop trigger if exists trg_restrict_student_update_fields on public.students;

create trigger trg_restrict_student_update_fields
  before update on public.students
  for each row
  execute function public.restrict_student_update_fields();
