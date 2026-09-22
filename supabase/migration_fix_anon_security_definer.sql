-- Fix anon SECURITY DEFINER exposure for helper and account RPCs
-- These functions are intentionally SECURITY DEFINER and must remain so:
-- - is_couple_member / is_couple_owner are RLS helpers; they must run as
--   definer to avoid recursion, and RLS policies need authenticated users
--   to be able to execute them (revoking authenticated would break reads).
-- - delete_own_account and couple_id_for_invite must be callable by
--   authenticated users (join / self-delete flows). Anonymous users never
--   need any of them — onboarding requires login first.
-- So we revoke anon (and public) and keep authenticated, and harden
-- search_path to '' with fully qualified names. No INVOKER switch.

-- is_couple_member
revoke all on function public.is_couple_member(uuid) from public;
revoke all on function public.is_couple_member(uuid) from anon;
revoke all on function public.is_couple_member(uuid) from authenticated;
create or replace function public.is_couple_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.couple_members where public.couple_members.couple_id = cid and public.couple_members.user_id = auth.uid());
$$;
grant execute on function public.is_couple_member(uuid) to authenticated;

-- is_couple_owner
revoke all on function public.is_couple_owner(uuid) from public;
revoke all on function public.is_couple_owner(uuid) from anon;
revoke all on function public.is_couple_owner(uuid) from authenticated;
create or replace function public.is_couple_owner(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.couple_members where public.couple_members.couple_id = cid and public.couple_members.user_id = auth.uid() and public.couple_members.role = 'owner');
$$;
grant execute on function public.is_couple_owner(uuid) to authenticated;

-- delete_own_account (PL/pgSQL, needs auth schema as well)
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
revoke all on function public.delete_own_account() from authenticated;
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.couple_members where public.couple_members.user_id = uid;
  delete from public.couples where public.couples.id not in (select public.couple_members.couple_id from public.couple_members);
  delete from public.profiles where public.profiles.id = uid;
  delete from auth.users where auth.users.id = uid;
end;
$$;
grant execute on function public.delete_own_account() to authenticated;

-- couple_id_for_invite was already hardened to search_path='' and anon revoked
-- in the previous migration; re-assert anon revoke here for completeness and
-- keep authenticated (INVOKER would be blocked by RLS for non-members).
revoke all on function public.couple_id_for_invite(text) from public;
revoke all on function public.couple_id_for_invite(text) from anon;
-- keep authenticated (already granted), no change

-- Leaked password protection is an Auth Dashboard setting, not a DB grant:
-- Supabase Dashboard -> Authentication -> Password Security -> Enable
-- "Leaked password protection" (HaveIBeenPwned). Enable it to clear
-- auth_leaked_password_protection warning.
