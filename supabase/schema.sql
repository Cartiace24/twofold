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

-- helper: is member?
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.couple_members where couple_id = cid and user_id = auth.uid());
$$;

create or replace function public.is_couple_owner(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.couple_members where couple_id = cid and user_id = auth.uid() and role = 'owner');
$$;

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

-- Invite-code lookup for joining. A partner who is NOT yet a member cannot
-- SELECT from couples (see policies above), so the app resolves the code
-- through this function, which returns only the couple id — never the row.
create or replace function public.couple_id_for_invite(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.couples where invite_code = upper(trim(p_code)) limit 1;
$$;
revoke all on function public.couple_id_for_invite(text) from public;
grant execute on function public.couple_id_for_invite(text) to authenticated;

-- Self-service account deletion. Deletes the auth user and lets
-- ON DELETE CASCADE clean profiles / memberships. Orphan couples (no
-- members left) are removed as well. Storage objects are best-effort
-- deleted by the client before calling this.
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

  -- leave all couples; delete orphaned couples (cascades to memories etc.)
  delete from public.couple_members where user_id = uid;
  delete from public.couples where id not in (select couple_id from public.couple_members);

  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- storage: private bucket `couple-photos` (create in dashboard), path = <couple_id>/...
-- Example policies (storage.objects):
-- create policy "member upload" on storage.objects for insert with check (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));
-- create policy "member read" on storage.objects for select using (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));
-- create policy "member delete" on storage.objects for delete using (bucket_id='couple-photos' and public.is_couple_member((string_to_array(name,'/'))[1]::uuid));

-- realtime: enable publication
-- alter publication supabase_realtime add table public.memories, public.notes, public.wishlist_items, public.timeline_events, public.places;
