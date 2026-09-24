-- Twofold — Supabase schema
-- Run in Supabase SQL editor. Requires pgcrypto for gen_random_uuid.

create extension if not exists "pgcrypto";

-- profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- couples
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  together_since date not null,
  description text default '',
  accent text default '#7D2E3B',
  secondary_accent text default '#B98282',
  background text default '#FAF6EF',
  theme_preset text default 'soft',
  theme_name text default 'Our Space',
  cover_url text,
  avatar_a_url text,
  avatar_b_url text,
  invite_code text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- membership
create table if not exists public.couple_members (
  couple_id uuid references public.couples(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner','member')),
  created_at timestamptz default now(),
  primary key (couple_id, user_id)
);

-- memories
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  caption text default '',
  date date not null,
  location_label text,
  lat double precision,
  lng double precision,
  tags text[] default '{}',
  creator text default '',
  favorite boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists memories_couple_idx on public.memories(couple_id, date desc);

create table if not exists public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  url text not null,
  caption text default '',
  sort int default 0,
  created_at timestamptz default now()
);
create index if not exists memory_photos_mem_idx on public.memory_photos(memory_id, sort);

-- notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  body text not null,
  style text default 'journal' check (style in ('scrap','sticky','letter','index','journal')),
  author text default '',
  favorite boolean default false,
  date_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists notes_couple_idx on public.notes(couple_id, created_at desc);

-- timeline
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  date date not null,
  description text default '',
  photo_url text,
  location_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- places
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  description text default '',
  lat double precision not null,
  lng double precision not null,
  date date,
  photo_url text,
  memory_id uuid references public.memories(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- wishlist
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  category text default 'Random',
  note text,
  done boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- long-distance photobooth sessions (temporary, couple-scoped; see
-- supabase/migration_photobooth_sessions.sql for design notes)
create table if not exists public.photobooth_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  creator_name text not null default '',
  partner_id uuid references auth.users(id) on delete set null,
  partner_name text not null default '',
  status text not null default 'waiting'
    check (status in ('waiting', 'joined', 'ready', 'countdown', 'complete', 'closed', 'expired')),
  preset_id text not null default 'softfilm',
  creator_ready boolean not null default false,
  partner_ready boolean not null default false,
  creator_photo text,
  partner_photo text,
  capture_at timestamptz,
  joined_at timestamptz,
  creator_seen_at timestamptz default now(),
  partner_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create index if not exists photobooth_sessions_couple_idx on public.photobooth_sessions(couple_id, created_at desc);

-- helpers: RLS helpers must be SECURITY DEFINER so policies can evaluate
-- without recursion; they are intentionally executable by authenticated
-- (required for RLS) but never by anon. Hardened with empty search_path.
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.couple_members where public.couple_members.couple_id = cid and public.couple_members.user_id = auth.uid());
$$;
revoke all on function public.is_couple_member(uuid) from public;
revoke all on function public.is_couple_member(uuid) from anon;
grant execute on function public.is_couple_member(uuid) to authenticated;

create or replace function public.is_couple_owner(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.couple_members where public.couple_members.couple_id = cid and public.couple_members.user_id = auth.uid() and public.couple_members.role = 'owner');
$$;
revoke all on function public.is_couple_owner(uuid) from public;
revoke all on function public.is_couple_owner(uuid) from anon;
grant execute on function public.is_couple_owner(uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.notes enable row level security;
alter table public.timeline_events enable row level security;
alter table public.places enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.photobooth_sessions enable row level security;

-- profiles: own only
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- couples: members only.
-- NOTE: the creator must be able to read the row back immediately after
-- INSERT (the app does insert->select->insert membership). Without the
-- "creator read" policy, creating a space fails with:
--   new row violates row-level security policy for table "couples"
drop policy if exists "member read" on public.couples;
create policy "member read" on public.couples for select using (public.is_couple_member(id));
drop policy if exists "creator read" on public.couples;
create policy "creator read" on public.couples for select using (created_by = auth.uid());
drop policy if exists "member update" on public.couples;
create policy "member update" on public.couples for update using (public.is_couple_member(id));
drop policy if exists "auth create" on public.couples;
create policy "auth create" on public.couples for insert with check (auth.uid() is not null);
drop policy if exists "owner delete" on public.couples;
create policy "owner delete" on public.couples for delete using (public.is_couple_owner(id));
-- allow last member to clean up an orphaned couple (no members left after they leave)
drop policy if exists "orphan delete" on public.couples;
create policy "orphan delete" on public.couples for delete using (
  not exists (select 1 from public.couple_members where couple_id = id)
);

-- members: own + fellow members readable
drop policy if exists "members rw" on public.couple_members;
create policy "members rw" on public.couple_members for all using (
  user_id = auth.uid() or public.is_couple_member(couple_id)
) with check (user_id = auth.uid());

-- generic couple-scoped helper policies
drop policy if exists "couple rw memories" on public.memories;
create policy "couple rw memories" on public.memories for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

drop policy if exists "couple rw photos" on public.memory_photos;
create policy "couple rw photos" on public.memory_photos for all using (
  exists (select 1 from public.memories m where m.id = memory_id and public.is_couple_member(m.couple_id))
) with check (
  exists (select 1 from public.memories m where m.id = memory_id and public.is_couple_member(m.couple_id))
);

drop policy if exists "couple rw notes" on public.notes;
create policy "couple rw notes" on public.notes for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

drop policy if exists "couple rw timeline" on public.timeline_events;
create policy "couple rw timeline" on public.timeline_events for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

drop policy if exists "couple rw places" on public.places;
create policy "couple rw places" on public.places for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

drop policy if exists "couple rw wishlist" on public.wishlist_items;
create policy "couple rw wishlist" on public.wishlist_items for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- long-distance photobooth sessions: members of the owning couple only
drop policy if exists "couple rw booth sessions" on public.photobooth_sessions;
create policy "couple rw booth sessions" on public.photobooth_sessions for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- Invite-code lookup for joining. A partner who is NOT yet a member cannot
-- SELECT from couples (see policies above), so the app resolves the code
-- through this function, which returns only the couple id — never the row.
-- SECURITY DEFINER is genuinely required (INVOKER would be blocked by RLS);
-- it is hardened with an empty search_path and qualified names, and only
-- authenticated users are allowed to call it (anonymous never needs it —
-- joining requires login, see src/store/AppContext.tsx:726).
create or replace function public.couple_id_for_invite(p_code text)
returns uuid language sql stable security definer set search_path = '' as $$
  select public.couples.id from public.couples where public.couples.invite_code = upper(trim(p_code)) limit 1;
$$;
revoke all on function public.couple_id_for_invite(text) from public;
revoke all on function public.couple_id_for_invite(text) from anon;
revoke all on function public.couple_id_for_invite(text) from authenticated;
grant execute on function public.couple_id_for_invite(text) to authenticated;

-- Self-service account deletion. Deletes the auth user and lets
-- ON DELETE CASCADE clean profiles / memberships. Orphan couples (no
-- members left) are removed as well. Storage objects are best-effort
-- deleted by the client before calling this. Only authenticated users
-- may call it (anon never needs it).
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
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

-- storage: private bucket `couple-photos` (create in dashboard), path = <couple_id>/...
-- Example policies (storage.objects):
-- create policy "member upload" on storage.objects for insert with check (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));
-- create policy "member read" on storage.objects for select using (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));
-- create policy "member delete" on storage.objects for delete using (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));

-- Legal acceptances — records the version the user acknowledged at signup
create table if not exists public.legal_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now()
);
alter table public.legal_acceptances enable row level security;
drop policy if exists "own legal acceptance" on public.legal_acceptances;
create policy "own legal acceptance" on public.legal_acceptances
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists legal_acceptances_user_idx on public.legal_acceptances(user_id);

-- Profile photos: personal, private, per-user (extends profiles)
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists updated_at timestamptz default now();
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_photobooth_sessions_updated_at on public.photobooth_sessions;
create trigger trg_photobooth_sessions_updated_at before update on public.photobooth_sessions
  for each row execute function public.touch_updated_at();
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
drop policy if exists "own profile all" on public.profiles;
drop policy if exists "own profile" on public.profiles;
create policy "own profile all" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "partner can read profile" on public.profiles;
create policy "partner can read profile" on public.profiles for select using (public.is_same_couple(id));
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name, avatar_path)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), null)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', false) on conflict (id) do nothing;
drop policy if exists "profile-photos own insert" on storage.objects;
create policy "profile-photos own insert" on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "profile-photos own update" on storage.objects;
create policy "profile-photos own update" on storage.objects for update to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid()) with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "profile-photos own delete" on storage.objects;
create policy "profile-photos own delete" on storage.objects for delete to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "profile-photos partner read" on storage.objects;
create policy "profile-photos partner read" on storage.objects for select to authenticated using (bucket_id = 'profile-photos' and ((storage.foldername(name))[1]::uuid = auth.uid() or public.is_same_couple((storage.foldername(name))[1]::uuid)));

-- realtime: enable publication (couples included so partner theme/appearance updates arrive live)
-- alter publication supabase_realtime add table public.memories, public.notes, public.wishlist_items, public.timeline_events, public.places, public.couples, public.photobooth_sessions;
