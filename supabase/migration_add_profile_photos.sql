-- Profile photos: personal, private, per-user
-- Extends public.profiles (keeps avatar_url for backwards compat), adds
-- avatar_path (storage path) + updated_at, trigger, helpers, RLS, bucket.

-- 1. Columns (idempotent)
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Keep avatar_url for legacy data, but new code writes avatar_path = '{uid}/avatar.jpg'

-- Ensure updated_at auto-touches
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 2. Helper: do two users share a couple? (for partner visibility)
create or replace function public.is_same_couple(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couple_members m1
    join public.couple_members m2 on m1.couple_id = m2.couple_id
    where m1.user_id = auth.uid() and m2.user_id = target
  );
$$;
revoke all on function public.is_same_couple(uuid) from public;
revoke all on function public.is_same_couple(uuid) from anon;
grant execute on function public.is_same_couple(uuid) to authenticated;

-- 3. RLS: keep own full access, plus partner can read (for avatar display)
-- Existing "own profile" is `for all using (id=auth.uid())`. Replace with
-- two policies so partner reads are allowed but writes stay own-only.
drop policy if exists "own profile" on public.profiles;
create policy "own profile all" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "partner can read profile" on public.profiles;
create policy "partner can read profile" on public.profiles
  for select using (public.is_same_couple(id));

-- 4. Auto-create profile on signup (handles Google OAuth too)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name, avatar_path)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for existing auth.users without profiles (existing users)
insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- 5. Storage bucket: private profile-photos
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- Storage RLS (storage.objects). Bucket must be private.
-- Path is "{user_id}/avatar.jpg" — first segment is the owner uuid.
-- We use security definer helper for partner read.

-- Own upload / update / delete (only your own directory)
drop policy if exists "profile-photos own insert" on storage.objects;
create policy "profile-photos own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());

drop policy if exists "profile-photos own update" on storage.objects;
create policy "profile-photos own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid())
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());

drop policy if exists "profile-photos own delete" on storage.objects;
create policy "profile-photos own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());

-- Read: own OR partner (same couple). Keeps private by default, but allows
-- the partner's avatar to be displayed where the app already shows partner info.
drop policy if exists "profile-photos partner read" on storage.objects;
create policy "profile-photos partner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1]::uuid = auth.uid()
      or public.is_same_couple((storage.foldername(name))[1]::uuid)
    )
  );
