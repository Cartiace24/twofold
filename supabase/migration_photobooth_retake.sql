-- Long-Distance Photobooth: synchronized retake.
--
-- Adds an explicit RETAKE_REQUESTED state (plus who/when columns) so one
-- partner's retake is a coordinated session transition, not a local reset:
-- both clients clear their captured previews, return to the camera,
-- re-verify camera readiness, and re-enable Take Photo together.

alter table public.photobooth_sessions add column if not exists retake_at timestamptz;
alter table public.photobooth_sessions add column if not exists retake_by text not null default '';

-- The status check was created inline, so Postgres named it
-- photobooth_sessions_status_check. Re-create it with the new state.
alter table public.photobooth_sessions drop constraint if exists photobooth_sessions_status_check;
alter table public.photobooth_sessions
  add constraint photobooth_sessions_status_check
  check (status in ('waiting', 'joined', 'ready', 'countdown', 'complete', 'retake_requested', 'closed', 'expired'));
