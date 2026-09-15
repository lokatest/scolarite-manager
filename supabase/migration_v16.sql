-- =====================================================================
-- MIGRATION v16 — Correctifs sécurité : isolation par gestionnaire
--
-- 1) students : full_name/niveau réservés à l'admin (trigger).
-- 2) payment_requests : un gestionnaire ne peut modifier/supprimer que
--    SES PROPRES demandes en attente, plus jamais celles d'un collègue.
--    L'admin garde son contrôle total, inchangé.
-- 3) claims : même principe pour les réclamations.
--
-- Dans tous les cas, la LECTURE reste partagée pour tous (inchangée) :
-- seule l'écriture (modification/suppression) est désormais isolée par
-- auteur.
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
    if new.full_name is distinct from old.full_name
       or new.niveau is distinct from old.niveau then
      raise exception
        'Seul un administrateur peut modifier le nom complet ou le niveau d''un étudiant.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restrict_student_update_fields on public.students;

create trigger trg_restrict_student_update_fields
  before update on public.students
  for each row
  execute function public.restrict_student_update_fields();

-- ---------------------------------------------------------------------
-- payment_requests : isolation par auteur (requested_by)
-- ---------------------------------------------------------------------

drop policy if exists "payment_requests_update_pending_by_active_users" on public.payment_requests;
create policy "payment_requests_update_pending_by_active_users"
  on public.payment_requests for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and status = 'en_attente'
    and requested_by = auth.uid()
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and requested_by = auth.uid()
  );

drop policy if exists "payment_requests_delete_pending_by_active_users" on public.payment_requests;
create policy "payment_requests_delete_pending_by_active_users"
  on public.payment_requests for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
    and status = 'en_attente'
    and requested_by = auth.uid()
  );

-- ---------------------------------------------------------------------
-- claims : isolation par auteur (created_by)
-- ---------------------------------------------------------------------

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
    and created_by = auth.uid()
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_active and p.role = 'user'
    )
    and created_by = auth.uid()
  );

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
    and created_by = auth.uid()
  );
