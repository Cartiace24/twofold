-- Twofold migration: fix "new row violates row-level security policy for table couples"
-- Run this in Supabase Dashboard → SQL editor. Safe to run more than once.
--
-- Root cause: the app creates a space via insert->select, then inserts the
-- membership row. The old SELECT policy only allowed existing members to read
-- the couples row, so the read-back of a just-created row was denied.
-- Joining by invite code had the same problem for non-members.

-- 1. Track who created each couple space
alter table public.couples
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill spaces created before this column existed (from owner membership)
update public.couples c
set created_by = m.user_id
from public.couple_members m
where m.couple_id = c.id
  and m.role = 'owner'
  and c.created_by is null;

-- 2. Let the creator read the row back right after INSERT
drop policy if exists "creator read" on public.couples;
create policy "creator read" on public.couples
  for select using (created_by = auth.uid());

-- 3. Invite-code lookup for non-members (returns only the id, never the row)
create or replace function public.couple_id_for_invite(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.couples where invite_code = upper(trim(p_code)) limit 1;
$$;
revoke all on function public.couple_id_for_invite(text) from public;
grant execute on function public.couple_id_for_invite(text) to authenticated;
