-- Long-Distance Photobooth sessions (temporary, couple-scoped).
--
-- Design notes:
-- - No video is ever transmitted: each device captures its own frame
--   locally at a shared future capture_at timestamp, then stores only
--   the final compressed photo (data URL, same convention as
--   memory_photos.url) in its own column. No new Storage bucket needed.
-- - Either client composes the combined strip locally from the two
--   photos + the shared preset, so no server-side processing is needed.
-- - Rows are ephemeral: clients delete the session on End / leave, and
--   expires_at bounds abandoned sessions. The permanent saved memory
--   lives in memories/memory_photos and is never touched by cleanup.

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

create index if not exists photobooth_sessions_couple_idx
  on public.photobooth_sessions(couple_id, created_at desc);

-- keep updated_at fresh (reuses the existing helper)
drop trigger if exists trg_photobooth_sessions_updated_at on public.photobooth_sessions;
create trigger trg_photobooth_sessions_updated_at before update on public.photobooth_sessions
  for each row execute function public.touch_updated_at();

alter table public.photobooth_sessions enable row level security;

-- Couple members only: a random authenticated user can neither read nor
-- join another couple's session. Reuses is_couple_member like the rest.
drop policy if exists "couple rw booth sessions" on public.photobooth_sessions;
create policy "couple rw booth sessions" on public.photobooth_sessions for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Realtime: both devices subscribe to session rows (id=eq filter) and the
-- partner watches open invites (couple_id=eq filter). Safe to re-run.
do $$
begin
  alter publication supabase_realtime add table public.photobooth_sessions;
exception when duplicate_object then
  null;
end
$$;
