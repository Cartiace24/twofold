-- Legal acceptances — records the version the user acknowledged at signup
-- Complements src/lib/legal.ts TERMS_VERSION / PRIVACY_VERSION

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
