-- Fix Security Advisor warnings for couple_id_for_invite
-- Why this function exists: authenticated users who are not yet members
-- cannot SELECT from public.couples due to RLS (member read only), so
-- joining by invite code must resolve the code to a couple_id via a
-- controlled RPC that returns only the id, never the row.
-- Flow: Authenticated user enters invite code on /welcome (joinCouple
-- in src/store/AppContext.tsx:732) -> rpc -> upsert couple_members.
-- Anonymous users never call this — onboarding requires login first.
--
-- Security goal: keep invite-code joining working, minimize privilege.
-- Keep SECURITY DEFINER (INVOKER would fail RLS), harden it, revoke anon.

-- Remove any prior grants (anon was flagged; public is the default)
revoke all on function public.couple_id_for_invite(text) from public;
revoke all on function public.couple_id_for_invite(text) from anon;
revoke all on function public.couple_id_for_invite(text) from authenticated;

-- Harden: explicit empty search_path, fully qualified table, no dynamic SQL,
-- returns only uuid, no writes, stable
create or replace function public.couple_id_for_invite(p_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select public.couples.id from public.couples where public.couples.invite_code = upper(trim(p_code)) limit 1;
$$;

-- Minimal grants: only authenticated users who need to join
grant execute on function public.couple_id_for_invite(text) to authenticated;

-- Ensure helper RLS functions stay as they are (required for policies);
-- they are not directly used by the frontend and are not part of this fix.
