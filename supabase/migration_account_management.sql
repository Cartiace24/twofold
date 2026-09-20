-- Twofold migration: account / couple management + Storage cleanup
-- Run in Supabase Dashboard → SQL editor. Safe to run more than once.

-- 1. Owner helper + delete policies for couples
create or replace function public.is_couple_owner(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.couple_members where couple_id = cid and user_id = auth.uid() and role = 'owner');
$$;

drop policy if exists "owner delete" on public.couples;
create policy "owner delete" on public.couples for delete using (public.is_couple_owner(id));
drop policy if exists "orphan delete" on public.couples;
create policy "orphan delete" on public.couples for delete using (
  not exists (select 1 from public.couple_members where couple_id = id)
);

-- 2. Self-service account deletion
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.couple_members where user_id = uid;
  delete from public.couples where id not in (select couple_id from public.couple_members);
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
