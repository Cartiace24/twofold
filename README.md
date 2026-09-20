# twofold — Two Lives, one story.

Private digital scrapbook + diary for couples. Mobile-first. React + Vite + TS + Tailwind v4 + Supabase + Leaflet, deployed on Cloudflare Pages.

## Run locally

```bash
npm install
npm run dev
```

Demo mode works with **no env vars** — data is seeded + stored in `localStorage`, any email logs in.

## Go live with Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a **private** Storage bucket `couple-photos` + the storage policies at the bottom of `schema.sql`.
4. Enable Realtime for `memories, notes, wishlist_items, timeline_events, places`.
5. Enable Auth providers (Email + Google if you want).
6. Copy `.env.example` → `.env.local` (Vite loads `.env` / `.env.local` — never `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   # or VITE_SUPABASE_PUBLISHABLE_KEY (new naming also works)
```

7. `npm run dev` — auth, RLS couple spaces, storage uploads, and realtime kick in automatically.

Photo uploads compress client-side (`src/lib/image.ts`, max 1600px JPEG ~0.82) before Storage upload / demo data-URLs.

## Deploy — Cloudflare Pages

- Build: `npm run build`, output `dist`.
- Pages → Create → Upload `dist`, or connect git:
  - Build command: `npm run build`
  - Output: `dist`
  - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- SPA fallback: Pages handles `/*` → `index.html` automatically for Vite builds. `public/_redirects` is included as backup.

## Structure

```
src/
  lib/       utils, types, supabase client, format, image compression
  data/      realistic seed content
  store/     AppContext — auth + couple + CRUD + realtime (Supabase or demo fallback)
  components/
    ui/        Button, Input, Sheet (mobile bottom-sheet), Empty
    scrapbook/ Polaroid, Tape, Doodles, SectionHeading, Logo
    layout/    DesktopSidebar, MobileNav (Home·Memories·Add·Notes·More), TopBar, QuickAdd
    forms/     Memory, Note, Milestone, Place, Wish forms (48px+ touch targets)
  pages/     Landing, Auth, Onboarding, Home, Memories(+Detail), Gallery, Notes, Timeline, Places (Leaflet+OSM), Wishlist, Profile, More
supabase/schema.sql  — tables, FKs, RLS (couple-private), realtime notes
```

## Design notes

Warm paper (`#FAF6EF`), ink (`#2B2622`), sage / blush / wine accents. Fraunces (editorial) + Caveat (hand) + Karla (body). Polaroids, washi tape, stamps, doodles — photos stay the hero, decorations stay sparse. Mobile-first (320–430px, no h-scroll, bottom nav + sheets), tablet adapts, desktop adds sidebar + multi-column.
