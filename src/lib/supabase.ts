import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  const raw = import.meta.env[name] as string | undefined;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().replace(/^["']|["']$/g, "");
  return v.length ? v : undefined;
}

// Keep compatibility with the existing VITE_SUPABASE_ANON_KEY name,
// while also accepting Supabase's newer publishable-key naming.
const url =
  readEnv("VITE_SUPABASE_URL");

const anon =
  readEnv("VITE_SUPABASE_ANON_KEY") ??
  readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  readEnv("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

function looksValid(u: string | undefined, key: string | undefined): boolean {
  if (!u || !key) return false;
  if (!/^https:\/\/.+\..+/.test(u)) return false;
  if (/your-project|example|changeme|placeholder/i.test(u)) return false;
  if (key.length < 20) return false;
  return true;
}

export const isSupabaseConfigured = looksValid(url, anon);

/** 'supabase' when both vars are present and plausible, otherwise 'demo'. */
export const authMode: "supabase" | "demo" = isSupabaseConfigured ? "supabase" : "demo";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

// Dev-only visibility into which mode is active. Never logs secrets —
if (import.meta.env.DEV && typeof console !== "undefined") {
  try {
    const host = url ? new URL(url).host : "(missing)";
    // eslint-disable-next-line no-console
    console.info(
      `%c[twofold] auth mode: ${authMode} — ${isSupabaseConfigured ? `Supabase project ${host}` : "demo/localStorage (set VITE_SUPABASE_URL + key to go live)"}`,
      "color:#7D2E3B"
    );
  } catch {
    // eslint-disable-next-line no-console
    console.info(`[twofold] auth mode: ${authMode}`);
  }
}
