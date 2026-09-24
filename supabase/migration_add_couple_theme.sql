-- Couple theme / appearance — couple-level customization
-- Adds named presets and custom colors to couples table.
-- Reuses existing member-update RLS (is_couple_member) — no new policies needed
-- for couples, as theme lives on the couple row itself.

alter table public.couples add column if not exists theme_preset text default 'soft';
alter table public.couples add column if not exists theme_name text default 'Our Space';
alter table public.couples add column if not exists secondary_accent text default '#B98282';
alter table public.couples add column if not exists background text default '#FAF6EF';

-- Backfill nulls from existing rows (accent already exists)
update public.couples set secondary_accent = coalesce(secondary_accent, '#B98282') where secondary_accent is null;
update public.couples set background = coalesce(background, '#FAF6EF') where background is null;
update public.couples set theme_preset = coalesce(theme_preset, 'soft') where theme_preset is null;
update public.couples set theme_name = coalesce(theme_name, 'Our Space') where theme_name is null;

-- Optional: constrain preset values (allows custom nulls to stay)
-- No hard check — custom colors may differ from preset, keep flexible.
