import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authMode, getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { makeInviteCode, todayISO, uid } from "../lib/format";
import { PRIVACY_VERSION, TERMS_VERSION } from "../lib/legal";
import { applyTheme, themeFromCouple } from "../lib/theme";
import type { CoupleTheme } from "../lib/theme";
import type { Couple, Memory, Note, Place, Profile, TimelineEvent, WishlistItem } from "../lib/types";
import { seedCouple, seedMemories, seedNotes, seedPlaces, seedTimeline, seedWishlist } from "../data/seed";

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AppState {
  user: User | null;
  profile: Profile | null;
  partnerProfile: Profile | null;
  avatarUrl: string | null;
  partnerAvatarUrl: string | null;
  profileLoading: boolean;
  avatarBusy: boolean;
  avatarError: string;
  theme: CoupleTheme;
  couple: Couple | null;
  authLoading: boolean;
  dataLoading: boolean;
  usingDemo: boolean;
  memories: Memory[];
  notes: Note[];
  timeline: TimelineEvent[];
  places: Place[];
  wishlist: WishlistItem[];
  // auth
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  /** True while the session came from a password-recovery link. */
  isRecovery: boolean;
  // couple
  createCouple: (name: string, since: string) => Promise<void>;
  joinCouple: (code: string) => Promise<{ error?: string }>;
  updateCouple: (patch: Partial<Couple>) => Promise<void>;
  regenerateCode: () => Promise<void>;
  leaveCouple: () => Promise<{ error?: string }>;
  deleteCouple: () => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  isOwner: boolean;
  // avatar
  uploadAvatar: (blob: Blob) => Promise<{ error?: string }>;
  removeAvatar: () => Promise<{ error?: string }>;
  refreshProfiles: () => Promise<void>;
  // memories
  addMemory: (m: Omit<Memory, "id" | "couple_id" | "created_at">) => Promise<string>;
  updateMemory: (id: string, patch: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleMemoryFav: (id: string) => Promise<void>;
  // notes
  addNote: (n: Omit<Note, "id" | "couple_id" | "created_at">) => Promise<void>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleNoteFav: (id: string) => Promise<void>;
  // timeline
  addMilestone: (t: Omit<TimelineEvent, "id" | "couple_id" | "created_at">) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  // places
  addPlace: (p: Omit<Place, "id" | "couple_id" | "created_at">) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  // wishlist
  addWish: (title: string, category: WishlistItem["category"], note?: string) => Promise<void>;
  toggleWish: (id: string) => Promise<void>;
  deleteWish: (id: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
};

function toUser(sUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
  return {
    id: sUser.id,
    email: sUser.email ?? "",
    displayName: (sUser.user_metadata?.display_name as string) || sUser.email?.split("@")[0] || "You",
  };
}

/** Map raw Supabase auth errors to friendly, actionable messages. */
function friendlyAuthError(message: string): string {
  if (import.meta.env.DEV && typeof console !== "undefined") {
    // Always keep the raw error in the dev console — the friendly text
    // hides details (e.g. which limit) needed for debugging.
    // eslint-disable-next-line no-console
    console.warn("[twofold] auth error (raw):", message);
  }
  const m = message.toLowerCase();
  if (m.includes("user already registered") || m.includes("already been registered") || m.includes("already exists"))
    return "That email already has an account. Try logging in instead.";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Wrong email or password. Try again?";
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("password should be") || m.includes("weak password") || m.includes("short"))
    return "That password is too weak — use at least 6 characters.";
  if (m.includes("invalid email") || m.includes("valid email"))
    return "That email doesn't look right.";
  if (m.includes("session missing"))
    return "This reset link is invalid or has expired. Send yourself a new one below.";
  if (m.includes("expired") && (m.includes("token") || m.includes("otp") || m.includes("link") || m.includes("code")))
    return "This reset link is invalid or has expired. Send yourself a new one below.";
  if (m.includes("same password") || m.includes("different password"))
    return "Pick a password you haven't used before.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts — Supabase paused this for a bit. Wait a few minutes and try again.";
  return message;
}

const LS = "twofold-v1";

interface Persist {
  user: User | null;
  couple: Couple | null;
  memories: Memory[];
  notes: Note[];
  timeline: TimelineEvent[];
  places: Place[];
  wishlist: WishlistItem[];
}

function loadLocal(): Persist | null {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function seedPersist(user: User): Persist {
  return {
    user,
    couple: { ...seedCouple },
    memories: seedMemories,
    notes: seedNotes,
    timeline: seedTimeline,
    places: seedPlaces,
    wishlist: seedWishlist,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  // personal profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const theme = useMemo(() => themeFromCouple(couple), [couple]);

  // Apply the couple-level theme globally through CSS variables.
  // When there is no couple (or no custom theme), themeFromCouple returns
  // the default theme, which matches the stock Twofold appearance.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Tracks the signed-in user id outside subscription closures (which would
  // otherwise capture stale state). Used to ignore duplicate auth events.
  const userIdRef = useRef<string | null>(null);

  // ---- init ----
  useEffect(() => {
    if (import.meta.env.DEV && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info(`[twofold] AppProvider init — auth mode: ${authMode}`);
    }
    const sb = getSupabase();
    if (isSupabaseConfigured && sb) {
      let cancelled = false;
      sb.auth
        .getSession()
        .then(async ({ data, error }) => {
          if (cancelled) return;
          if (error) {
            // eslint-disable-next-line no-console
            console.warn("[twofold] getSession failed:", error.message);
          }
          const sUser = data.session?.user;
          if (sUser) {
            const u = toUser(sUser);
            setUser(u);
            await fetchCoupleData(sb, u.id);
            if (cancelled) return;
          }
          setAuthLoading(false);
          setDataLoading(false);
        })
        .catch((e) => {
          if (cancelled) return;
          // eslint-disable-next-line no-console
          console.warn("[twofold] getSession threw:", e);
          setAuthLoading(false);
          setDataLoading(false);
        });
      const { data: sub } = sb.auth.onAuthStateChange(async (ev, session) => {
        if (cancelled) return;
        if (import.meta.env.DEV && typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info(`[twofold] auth event: ${ev}`);
        }
        const sUser = session?.user;
        if (!sUser) {
          // Signed out / session gone — clear everything so no stale
          // couple data leaks between accounts.
          setUser(null);
          setIsRecovery(false);
          setRole(null);
          setCouple(null);
          setProfile(null);
          setPartnerProfile(null);
          setAvatarUrl(null);
          setPartnerAvatarUrl(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          setDataLoading(false);
          return;
        }
        const u = toUser(sUser);
        if (ev === "PASSWORD_RECOVERY") {
          // Arrived via a recovery link: establish the session so
          // updateUser() works, but don't load couple data or treat this
          // as a normal login — the user must set a password first, and
          // must not be bounced to /home or /welcome yet.
          setUser(u);
          setIsRecovery(true);
          return;
        }
        if (ev === "SIGNED_IN" || ev === "TOKEN_REFRESHED") {
          if (userIdRef.current === u.id) {
            // Supabase re-emits SIGNED_IN when a tab regains focus (alt+tab),
            // even though nothing changed. Same user → do absolutely nothing:
            // no setUser, no refetch. Previously this re-rendered the whole
            // tree and rebuilt map markers on every refocus.
            return;
          }
          // A PKCE recovery link (?code=…) resolves as SIGNED_IN, not
          // PASSWORD_RECOVERY. Recovery links always land on /reset (see
          // resetPassword redirectTo) while OAuth lands on /home — so only
          // treat ?code= as recovery on the reset page.
          if (
            typeof window !== "undefined" &&
            window.location.pathname === "/reset" &&
            window.location.search.includes("code=")
          ) {
            setUser(u);
            setIsRecovery(true);
            return;
          }
        }
        setUser(u);
        if (ev === "TOKEN_REFRESHED") {
          // Same user, fresh tokens only — no data work needed.
          return;
        }
        if (ev === "INITIAL_SESSION") {
          // Already covered by getSession() above; fetching again would
          // double-load on every mount.
          return;
        }
        await fetchCoupleData(sb, u.id, { silent: true });
      });
      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    } else {
      // demo mode
      const saved = loadLocal();
      if (saved?.user) {
        setUser(saved.user);
        setCouple(saved.couple);
        setMemories(saved.memories);
        setNotes(saved.notes);
        setTimeline(saved.timeline);
        setPlaces(saved.places);
        setWishlist(saved.wishlist);
      }
      setAuthLoading(false);
      setDataLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist demo
  useEffect(() => {
    if (isSupabaseConfigured) return;
    if (!user) return;
    const p: Persist = { user, couple, memories, notes, timeline, places, wishlist };
    try {
      localStorage.setItem(LS, JSON.stringify(p));
    } catch { /* ignore */ }
  }, [user, couple, memories, notes, timeline, places, wishlist]);

  // realtime (supabase only)
  // (userIdRef is declared above, next to the other state.)
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    const sb = getSupabase();
    if (!isSupabaseConfigured || !sb || !couple) return;
    const cid = couple.id;
    const refresh = () => {
      if (userIdRef.current) fetchCoupleData(sb, userIdRef.current, { silent: true });
    };
    const ch = sb
      .channel(`couple-${cid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "memories", filter: `couple_id=eq.${cid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `couple_id=eq.${cid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist_items", filter: `couple_id=eq.${cid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "timeline_events", filter: `couple_id=eq.${cid}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "couples", filter: `id=eq.${cid}` }, refresh)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couple?.id]);

  // Best-effort Storage cleanup: remove any objects that look like they
  // belong to this couple. No-ops if the bucket isn't configured or the
  // URLs are data-URLs (the current demo path).
  async function tryCleanupStorage(sb: ReturnType<typeof getSupabase> & {}, coupleId: string, urls: string[]) {
    if (!sb) return;
    const paths: string[] = [];
    for (const u of urls) {
      if (!u) continue;
      // Storage URLs contain /storage/v1/object/…/couple-photos/<coupleId>/…
      const m = u.match(/\/couple-photos\/(.+?)(?:[?#]|$)/);
      if (m) paths.push(`${coupleId}/${m[1].split("/").pop() ?? m[1]}`);
      else if (u.startsWith(`${coupleId}/`)) paths.push(u);
    }
    if (!paths.length) return;
    try {
      await sb.storage.from("couple-photos").remove(paths);
    } catch {
      /* best-effort */
    }
  }

  async function signedAvatarUrl(sb: ReturnType<typeof getSupabase> & {}, path: string | null): Promise<string | null> {
    if (!path || !sb) return null;
    if (path.startsWith("data:")) return path;
    // path is like "userId/avatar.jpg"
    try {
      const { data, error } = await sb.storage.from("profile-photos").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (error || !data?.signedUrl) return null;
      return `${data.signedUrl}&t=${Date.now()}`;
    } catch {
      return null;
    }
  }

  async function ensureProfile(sb: ReturnType<typeof getSupabase> & {}, uid: string, email: string, displayName: string) {
    if (!sb) return;
    const { data } = await sb.from("profiles").select("id").eq("id", uid).maybeSingle();
    if (!data) {
      await sb.from("profiles").insert({ id: uid, email, display_name: displayName });
    }
  }

  async function loadProfiles(sb: ReturnType<typeof getSupabase> & {}, uid: string, coupleId: string | null) {
    setProfileLoading(true);
    try {
      await ensureProfile(sb, uid, user?.email ?? "", user?.displayName ?? "You");
      const { data: me } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (me) {
        setProfile(me as Profile);
        setAvatarUrl(await signedAvatarUrl(sb, (me as Profile).avatar_path ?? null));
      }
      if (coupleId) {
        const { data: members } = await sb.from("couple_members").select("user_id").eq("couple_id", coupleId);
        const other = (members ?? []).find((m: { user_id: string }) => m.user_id !== uid) as { user_id: string } | undefined;
        if (other) {
          const { data: them } = await sb.from("profiles").select("*").eq("id", other.user_id).maybeSingle();
          if (them) {
            setPartnerProfile(them as Profile);
            setPartnerAvatarUrl(await signedAvatarUrl(sb, (them as Profile).avatar_path ?? null));
          } else {
            setPartnerProfile(null);
            setPartnerAvatarUrl(null);
          }
        } else {
          setPartnerProfile(null);
          setPartnerAvatarUrl(null);
        }
      } else {
        setPartnerProfile(null);
        setPartnerAvatarUrl(null);
      }
    } catch {
      /* ignore */
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchCoupleData(sb: ReturnType<typeof getSupabase> & {}, userId: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setDataLoading(true);
    try {
      // find couple via membership
      let membership = await sb
        .from("couple_members")
        .select("couple_id, role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle()
        .then((r) => r.data as { couple_id: string; role: string } | null);

      // Recover orphaned couple from the earlier RLS bug: a couple was
      // created but the membership row failed, so the user loops on
      // /welcome forever. If we find a couple they created, repair it.
      if (!membership) {
        const { data: orphan } = await sb
          .from("couples")
          .select("id")
          .eq("created_by", userId)
          .limit(1)
          .maybeSingle();
        if (orphan) {
          const oid = (orphan as { id: string }).id;
          const { error: repairErr } = await sb
            .from("couple_members")
            .upsert({ couple_id: oid, user_id: userId, role: "owner" }, { onConflict: "couple_id,user_id" });
          if (!repairErr) {
            membership = { couple_id: oid, role: "owner" };
          } else if (import.meta.env.DEV) {
            console.warn("[twofold] orphan repair failed", repairErr.message);
          }
        }
      }

      if (!membership) {
        setCouple(null);
        setRole(null);
        return;
      }
      const cid = membership.couple_id;
      setRole(membership.role ?? null);
      const [{ data: cpl }, { data: mems }, { data: nts }, { data: tls }, { data: pls }, { data: wsh }] = await Promise.all([
        sb.from("couples").select("*").eq("id", cid).single(),
        sb.from("memories").select("*, memory_photos(*)").eq("couple_id", cid).order("date", { ascending: false }),
        sb.from("notes").select("*").eq("couple_id", cid).order("created_at", { ascending: false }),
        sb.from("timeline_events").select("*").eq("couple_id", cid).order("date", { ascending: true }),
        sb.from("places").select("*").eq("couple_id", cid).order("created_at", { ascending: false }),
        sb.from("wishlist_items").select("*").eq("couple_id", cid).order("created_at", { ascending: false }),
      ]);
      setCouple(cpl as unknown as Couple);
      setMemories(((mems ?? []) as unknown as Array<Record<string, unknown>>).map((m) => ({
        ...(m as unknown as Memory),
        photos: ((m as { memory_photos?: Memory["photos"] }).memory_photos ?? []) as Memory["photos"],
      })));
      setNotes((nts ?? []) as unknown as Note[]);
      setTimeline((tls ?? []) as unknown as TimelineEvent[]);
      setPlaces((pls ?? []) as unknown as Place[]);
      setWishlist((wsh ?? []) as unknown as WishlistItem[]);
    } catch {
      // keep demo empty
    } finally {
      setDataLoading(false);
    }
  }

  // keep personal profiles in sync — own + partner, with signed URLs
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setPartnerProfile(null);
      setAvatarUrl(null);
      setPartnerAvatarUrl(null);
      setProfileLoading(false);
      return;
    }
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) void loadProfiles(sb, user.id, couple?.id ?? null);
    } else {
      const raw = (() => {
        try {
          return localStorage.getItem(LS + "-avatar-" + user.id);
        } catch {
          return null;
        }
      })();
      const url = raw && raw.startsWith("data:") ? raw : null;
      setProfile({ id: user.id, email: user.email, display_name: user.displayName, avatar_path: url ? "demo" : null, avatar_url: url });
      setAvatarUrl(url);
      if (couple) {
        // demo partner — uses seed avatar if available
        setPartnerProfile({ id: "partner-demo", email: "partner@example.com", display_name: "Mia", avatar_path: null, avatar_url: null });
        setPartnerAvatarUrl(null);
      } else {
        setPartnerProfile(null);
        setPartnerAvatarUrl(null);
      }
      setProfileLoading(false);
    }
  }, [user?.id, couple?.id]);

  const value: AppState = useMemo(() => {
    const sb = getSupabase();
    const authed = Boolean(user && couple);

    return {
      user,
      profile,
      partnerProfile,
      avatarUrl,
      partnerAvatarUrl,
      profileLoading,
      avatarBusy,
      avatarError,
      theme,
      couple,
      authLoading,
      dataLoading,
      usingDemo: !isSupabaseConfigured,
      isRecovery,
      isOwner: role === "owner",
      memories: [...memories].sort((a, b) => b.date.localeCompare(a.date)),
      notes: [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      timeline: [...timeline].sort((a, b) => a.date.localeCompare(b.date)),
      places,
      wishlist,

      signUp: async (email, password, name) => {
        if (isSupabaseConfigured && sb) {
          const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { display_name: name } },
          });
          if (error) return { error: friendlyAuthError(error.message) };
          // Email confirmation ON → no session yet: user exists in
          // Dashboard → Authentication → Users, but must confirm first.
          if (!data.session && data.user) return { needsConfirmation: true };
          if (data.session?.user) {
            const u = toUser(data.session.user);
            setUser(u);
            await fetchCoupleData(sb, u.id);
            // Record legal acceptance — best-effort, never blocks signup
            try {
              await sb.from("legal_acceptances").upsert(
                {
                  user_id: data.session.user.id,
                  terms_version: TERMS_VERSION,
                  privacy_version: PRIVACY_VERSION,
                },
                { onConflict: "user_id" }
              );
            } catch {
              /* acceptance table may not exist yet in dev */
            }
          }
          return {};
        }
        const u: User = { id: uid("u-"), email, displayName: name || email.split("@")[0] };
        const seeded = seedPersist(u);
        // fresh user starts with no couple (onboarding)
        setUser(u);
        setCouple(null);
        setMemories([]);
        setNotes([]);
        setTimeline([]);
        setPlaces([]);
        setWishlist([]);
        localStorage.setItem(LS, JSON.stringify({ ...seeded, couple: null, memories: [], notes: [], timeline: [], places: [], wishlist: [] }));
        return {};
      },
      signIn: async (email, _password) => {
        if (isSupabaseConfigured && sb) {
          const { data, error } = await sb.auth.signInWithPassword({ email, password: _password });
          if (error) return { error: friendlyAuthError(error.message) };
          // Set the user synchronously so callers can navigate right away
          // instead of racing onAuthStateChange.
          if (data.session?.user) {
            const u = toUser(data.session.user);
            setUser(u);
            await fetchCoupleData(sb, u.id);
          }
          return {};
        }
        const saved = loadLocal();
        if (saved?.user && saved.user.email.toLowerCase() === email.toLowerCase()) {
          setUser(saved.user);
          setCouple(saved.couple);
          setMemories(saved.memories);
          setNotes(saved.notes);
          setTimeline(saved.timeline);
          setPlaces(saved.places);
          setWishlist(saved.wishlist);
          return {};
        }
        // demo quick-login: any email works, restore seed if new
        const u: User = { id: uid("u-"), email, displayName: email.split("@")[0] };
        // if there is an existing saved couple under different email, keep it for demo continuity
        if (saved?.couple) {
          setUser(u);
          setCouple(saved.couple);
          setMemories(saved.memories);
          setNotes(saved.notes);
          setTimeline(saved.timeline);
          setPlaces(saved.places);
          setWishlist(saved.wishlist);
        } else {
          const s = seedPersist(u);
          setUser(s.user);
          setCouple(s.couple);
          setMemories(s.memories);
          setNotes(s.notes);
          setTimeline(s.timeline);
          setPlaces(s.places);
          setWishlist(s.wishlist);
        }
        return {};
      },
      signInWithGoogle: async () => {
        if (isSupabaseConfigured && sb) {
          const { error } = await sb.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/home` },
          });
          if (error) return { error: friendlyAuthError(error.message) };
          return {};
        }
        return { error: "Google login needs Supabase configured — use email login in demo mode." };
      },
      leaveCouple: async () => {
        if (isSupabaseConfigured && sb && user && couple) {
          // Collect Storage paths before we lose the couple id
          const urls = [
            ...memories.flatMap((m) => m.photos.map((p) => p.url)),
            ...places.map((p) => p.photo_url ?? ""),
            ...timeline.map((t) => t.photo_url ?? ""),
            couple.cover_url ?? "",
          ].filter(Boolean) as string[];
          const { error } = await sb.from("couple_members").delete().eq("couple_id", couple.id).eq("user_id", user.id);
          if (error) return { error: friendlyAuthError(error.message) };
          // Opportunistically clean orphaned Storage objects
          await tryCleanupStorage(sb, couple.id, urls);
          // If we were the last member, delete the orphaned couple row
          const { count } = await sb.from("couple_members").select("couple_id", { count: "exact", head: true }).eq("couple_id", couple.id);
          if (count === 0) {
            await sb.from("couples").delete().eq("id", couple.id);
          }
          setCouple(null);
          setRole(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          return {};
        }
        // demo: just clear couple
        setCouple(null);
        setRole(null);
        setMemories([]);
        setNotes([]);
        setTimeline([]);
        setPlaces([]);
        setWishlist([]);
        return {};
      },
      deleteCouple: async () => {
        if (isSupabaseConfigured && sb && couple) {
          const urls = [
            ...memories.flatMap((m) => m.photos.map((p) => p.url)),
            ...places.map((p) => p.photo_url ?? ""),
            ...timeline.map((t) => t.photo_url ?? ""),
            couple.cover_url ?? "",
          ].filter(Boolean) as string[];
          await tryCleanupStorage(sb, couple.id, urls);
          // RLS: owner only (or orphan). Member attempt will 403 → surfaced.
          const { error } = await sb.from("couples").delete().eq("id", couple.id);
          if (error) return { error: friendlyAuthError(error.message) };
          setCouple(null);
          setRole(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          return {};
        }
        setCouple(null);
        setRole(null);
        setMemories([]);
        setNotes([]);
        setTimeline([]);
        setPlaces([]);
        setWishlist([]);
        return {};
      },
      deleteAccount: async () => {
        if (isSupabaseConfigured && sb && user) {
          // Best-effort Storage purge for this user's couple before the RPC
          // removes the DB rows. Do it here while we still have the ids.
          if (couple) {
            const urls = [
              ...memories.flatMap((m) => m.photos.map((p) => p.url)),
              ...places.map((p) => p.photo_url ?? ""),
              ...timeline.map((t) => t.photo_url ?? ""),
              couple.cover_url ?? "",
            ].filter(Boolean) as string[];
            await tryCleanupStorage(sb, couple.id, urls);
          }
          // also try to remove own avatar from storage before account goes away
          try {
            if (profile?.avatar_path) await sb.storage.from("profile-photos").remove([profile.avatar_path]);
          } catch {}
          const { error } = await sb.rpc("delete_own_account");
          if (error) return { error: friendlyAuthError(error.message) };
          await sb.auth.signOut();
          setUser(null);
          setIsRecovery(false);
          setRole(null);
          setCouple(null);
          setProfile(null);
          setPartnerProfile(null);
          setAvatarUrl(null);
          setPartnerAvatarUrl(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          try {
            localStorage.removeItem(LS);
          } catch {}
          return {};
        }
        // demo: wipe everything
        try {
          localStorage.removeItem(LS);
        } catch {}
        try {
          if (user) localStorage.removeItem(LS + "-avatar-" + user.id);
        } catch {}
        setUser(null);
        setIsRecovery(false);
        setRole(null);
        setCouple(null);
        setProfile(null);
        setPartnerProfile(null);
        setAvatarUrl(null);
        setPartnerAvatarUrl(null);
        setMemories([]);
        setNotes([]);
        setTimeline([]);
        setPlaces([]);
        setWishlist([]);
        return {};
      },
      refreshProfiles: async () => {
        if (isSupabaseConfigured && sb && user) {
          await loadProfiles(sb, user.id, couple?.id ?? null);
        }
      },
      uploadAvatar: async (blob: Blob) => {
        if (!user) return { error: "Not signed in." };
        if (!blob.type.startsWith("image/")) return { error: "That image type isn't supported." };
        if (blob.size > 8 * 1024 * 1024) return { error: "That photo is too large to process." };
        setAvatarBusy(true);
        setAvatarError("");
        try {
          if (isSupabaseConfigured && sb) {
            const path = `${user.id}/avatar.jpg`;
            const { error: upErr } = await sb.storage.from("profile-photos").upload(path, blob, {
              contentType: "image/jpeg",
              upsert: true,
            });
            if (upErr) throw new Error(upErr.message);
            const { error: dbErr } = await sb.from("profiles").upsert(
              { id: user.id, email: user.email, display_name: user.displayName, avatar_path: path },
              { onConflict: "id" }
            );
            if (dbErr) throw new Error(dbErr.message);
            setProfile((p) => (p ? { ...p, avatar_path: path } : p));
            setAvatarUrl(await signedAvatarUrl(sb, path));
            // also refresh partner view if needed (partner sees new avatar via their own fetch, but update local)
            return {};
          } else {
            const { fileToDataUrl } = await import("../lib/image");
            const url = await fileToDataUrl(blob);
            try {
              localStorage.setItem(LS + "-avatar-" + user.id, url);
            } catch {}
            setAvatarUrl(url);
            setProfile((p) =>
              p ? { ...p, avatar_path: "demo", avatar_url: url } : { id: user.id, email: user.email, display_name: user.displayName, avatar_path: "demo", avatar_url: url }
            );
            return {};
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Couldn't save the photo. Please try again.";
          setAvatarError(msg);
          return { error: msg.includes("not supported") ? msg : "Couldn't save the photo. Please try again." };
        } finally {
          setAvatarBusy(false);
        }
      },
      removeAvatar: async () => {
        if (!user) return { error: "Not signed in." };
        setAvatarBusy(true);
        setAvatarError("");
        try {
          if (isSupabaseConfigured && sb) {
            if (profile?.avatar_path) {
              try {
                await sb.storage.from("profile-photos").remove([profile.avatar_path]);
              } catch {}
            } else if (avatarUrl) {
              // legacy avatar_url case — try to derive path
              try {
                await sb.storage.from("profile-photos").remove([`${user.id}/avatar.jpg`]);
              } catch {}
            }
            const { error } = await sb.from("profiles").update({ avatar_path: null, avatar_url: null }).eq("id", user.id);
            if (error) throw new Error(error.message);
            setAvatarUrl(null);
            setProfile((p) => (p ? { ...p, avatar_path: null, avatar_url: null } : p));
            return {};
          } else {
            try {
              localStorage.removeItem(LS + "-avatar-" + user.id);
            } catch {}
            setAvatarUrl(null);
            setProfile((p) => (p ? { ...p, avatar_path: null, avatar_url: null } : p));
            return {};
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Couldn't remove the photo. Please try again.";
          setAvatarError(msg);
          return { error: msg };
        } finally {
          setAvatarBusy(false);
        }
      },
      signOut: async () => {
        if (isSupabaseConfigured && sb) {
          await sb.auth.signOut();
          setUser(null);
          setRole(null);
          setCouple(null);
          setProfile(null);
          setPartnerProfile(null);
          setAvatarUrl(null);
          setPartnerAvatarUrl(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          return;
        }
        const saved = loadLocal();
        if (saved) {
          localStorage.setItem(LS, JSON.stringify({ ...saved, user: null }));
        }
        setUser(null);
        setProfile(null);
        setPartnerProfile(null);
        setAvatarUrl(null);
        setPartnerAvatarUrl(null);
      },
      resetPassword: async (email) => {
        if (isSupabaseConfigured && sb) {
          // redirectTo must be allowlisted in Supabase Dashboard →
          // Authentication → URL Configuration → Redirect URLs.
          // window.location.origin keeps this working in dev and prod.
          const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset`,
          });
          if (error) return { error: friendlyAuthError(error.message) };
          return {};
        }
        return {};
      },
      updatePassword: async (password) => {
        if (isSupabaseConfigured && sb) {
          const { error } = await sb.auth.updateUser({ password });
          if (error) return { error: friendlyAuthError(error.message) };
          await sb.auth.signOut();
          setUser(null);
          setIsRecovery(false);
          setRole(null);
          setCouple(null);
          setProfile(null);
          setPartnerProfile(null);
          setAvatarUrl(null);
          setPartnerAvatarUrl(null);
          setMemories([]);
          setNotes([]);
          setTimeline([]);
          setPlaces([]);
          setWishlist([]);
          return {};
        }
        return { error: "Password reset needs Supabase configured — you're in demo mode." };
      },

      createCouple: async (name, since) => {
        if (isSupabaseConfigured && sb && user) {
          const code = makeInviteCode();
          const { data, error } = await sb.from("couples").insert({ name, together_since: since, invite_code: code, created_by: user.id }).select().single();
          if (error) throw new Error(error.message);
          const { error: memberError } = await sb.from("couple_members").insert({ couple_id: (data as { id: string }).id, user_id: user.id, role: "owner" });
          if (memberError) {
            // Roll back the couple so we don't orphan a row no one can read
            await sb.from("couples").delete().eq("id", (data as { id: string }).id);
            throw new Error(memberError.message);
          }
          await fetchCoupleData(sb, user.id);
          return;
        }
        const c: Couple = {
          id: uid("c-"),
          name,
          together_since: since || todayISO(),
          description: "Our little place on the internet.",
          invite_code: makeInviteCode(),
          cover_url: null,
          avatar_a_url: null,
          avatar_b_url: null,
        };
        setCouple(c);
        setMemories([]);
        setNotes([]);
        setTimeline([]);
        setPlaces([]);
        setWishlist([]);
      },
      joinCouple: async (code) => {
        if (isSupabaseConfigured && sb && user) {
          const clean = code.trim().toUpperCase();
          // Non-members cannot SELECT couples rows, so resolve the invite
          // code through the SECURITY DEFINER function (returns only the id).
          let coupleId: string | null = null;
          const { data: rpcData, error: rpcError } = await sb.rpc("couple_id_for_invite", { p_code: clean });
          if (!rpcError && rpcData) {
            coupleId = rpcData as string;
          } else {
            // Fallback for databases where the function isn't installed yet:
            // direct lookup (works once creator-read/member policies allow it).
            const { data, error } = await sb.from("couples").select("id").eq("invite_code", clean).maybeSingle();
            if (error || !data) return { error: "No couple found with that code. Check and try again." };
            coupleId = (data as { id: string }).id;
          }
          if (!coupleId) return { error: "No couple found with that code. Check and try again." };
          const { error: joinError } = await sb.from("couple_members").upsert({ couple_id: coupleId, user_id: user.id, role: "member" });
          if (joinError) return { error: joinError.message };
          await fetchCoupleData(sb, user.id);
          return {};
        }
        const saved = loadLocal();
        // demo: accept any 6-char, or restore seed if matches
        if (saved?.couple && saved.couple.invite_code === code.trim().toUpperCase()) {
          setCouple(saved.couple);
          setMemories(saved.memories);
          return {};
        }
        if (code.trim().length < 4) return { error: "That code looks too short." };
        // join = keep current couple if exists else seed
        if (!couple) {
          const s = seedCouple;
          setCouple({ ...s, invite_code: code.trim().toUpperCase() });
          setMemories(seedMemories);
          setNotes(seedNotes);
          setTimeline(seedTimeline);
          setPlaces(seedPlaces);
          setWishlist(seedWishlist);
        }
        return {};
      },
      updateCouple: async (patch) => {
        if (isSupabaseConfigured && sb && couple) {
          // If the new cover is a data URL and a Storage bucket exists,
          // optionally clean the previous Storage object (best-effort).
          const prevUrl = (couple as { cover_url?: string | null }).cover_url;
          const nextUrl = (patch as { cover_url?: string | null }).cover_url;
          if (prevUrl && nextUrl && prevUrl !== nextUrl && !nextUrl.startsWith("data:")) {
            await tryCleanupStorage(sb, couple.id, [prevUrl]);
          }
          const { error } = await sb.from("couples").update(patch).eq("id", couple.id);
          if (error) throw new Error(error.message);
          if (user) await fetchCoupleData(sb, user.id, { silent: true });
          return;
        }
        if (couple) setCouple({ ...couple, ...patch });
      },
      regenerateCode: async () => {
        const code = makeInviteCode();
        if (isSupabaseConfigured && sb && couple) {
          await sb.from("couples").update({ invite_code: code }).eq("id", couple.id);
          if (user) await fetchCoupleData(sb, user.id, { silent: true });
          return;
        }
        if (couple) setCouple({ ...couple, invite_code: code });
      },

      addMemory: async (m) => {
        const id = uid("m-");
        if (isSupabaseConfigured && sb && couple && user) {
          const { data, error } = await sb.from("memories").insert({
            couple_id: couple.id, title: m.title, caption: m.caption, date: m.date,
            location_label: m.location_label, lat: m.lat, lng: m.lng, tags: m.tags,
            creator: m.creator || user.displayName, favorite: m.favorite,
            created_by: user.id,
          }).select().single();
          if (error) throw new Error(error.message);
          const mid = (data as { id: string }).id;
          if (m.photos.length) {
            await sb.from("memory_photos").insert(m.photos.map((p, i) => ({ memory_id: mid, url: p.url, caption: p.caption, sort: i })));
          }
          await fetchCoupleData(sb, user.id);
          return mid;
        }
        const rec: Memory = { ...m, id, couple_id: couple?.id ?? "couple-demo", created_at: new Date().toISOString() };
        setMemories((prev) => [rec, ...prev]);
        void authed;
        return id;
      },
      updateMemory: async (id, patch) => {
        if (isSupabaseConfigured && sb && user && couple) {
          const { photos, ...rest } = patch as Partial<Memory>;
          // If photos are being replaced, collect old Storage paths for cleanup
          let oldUrls: string[] = [];
          if (photos) {
            const cur = memories.find((m) => m.id === id);
            if (cur) oldUrls = cur.photos.map((p) => p.url);
          }
          if (Object.keys(rest).length) {
            const { error } = await sb.from("memories").update(rest).eq("id", id);
            if (error) throw new Error(error.message);
          }
          if (photos) {
            await sb.from("memory_photos").delete().eq("memory_id", id);
            if (photos.length) await sb.from("memory_photos").insert(photos.map((p, i) => ({ memory_id: id, url: p.url, caption: p.caption, sort: i })));
            // Best-effort: remove replaced Storage objects that are no longer referenced
            const nextSet = new Set(photos.map((p) => p.url));
            const removed = oldUrls.filter((u) => !nextSet.has(u));
            if (removed.length) await tryCleanupStorage(sb, couple.id, removed);
          }
          await fetchCoupleData(sb, user.id);
          return;
        }
        if (isSupabaseConfigured && sb && user) {
          const { photos, ...rest } = patch as Partial<Memory>;
          if (Object.keys(rest).length) await sb.from("memories").update(rest).eq("id", id);
          if (photos) {
            await sb.from("memory_photos").delete().eq("memory_id", id);
            if (photos.length) await sb.from("memory_photos").insert(photos.map((p, i) => ({ memory_id: id, url: p.url, caption: p.caption, sort: i })));
          }
          await fetchCoupleData(sb, user.id);
          return;
        }
        setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      },
      deleteMemory: async (id) => {
        if (isSupabaseConfigured && sb && user && couple) {
          const cur = memories.find((m) => m.id === id);
          const urls = cur ? cur.photos.map((p) => p.url) : [];
          const { error } = await sb.from("memories").delete().eq("id", id);
          if (error) throw new Error(error.message);
          await tryCleanupStorage(sb, couple.id, urls);
          await fetchCoupleData(sb, user.id);
          return;
        }
        if (isSupabaseConfigured && sb && user) {
          await sb.from("memories").delete().eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setMemories((prev) => prev.filter((m) => m.id !== id));
      },
      toggleMemoryFav: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          const cur = memories.find((m) => m.id === id);
          await sb.from("memories").update({ favorite: !cur?.favorite }).eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m)));
      },

      addNote: async (n) => {
        if (isSupabaseConfigured && sb && couple && user) {
          await sb.from("notes").insert({ couple_id: couple.id, body: n.body, style: n.style, author: n.author || user.displayName, favorite: n.favorite, date_label: n.date_label, created_by: user.id });
          await fetchCoupleData(sb, user.id);
          return;
        }
        setNotes((prev) => [{ ...n, id: uid("n-"), couple_id: couple?.id ?? "couple-demo", created_at: new Date().toISOString() }, ...prev]);
      },
      updateNote: async (id, patch) => {
        if (isSupabaseConfigured && sb && user) {
          await sb.from("notes").update(patch).eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      },
      deleteNote: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          await sb.from("notes").delete().eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setNotes((prev) => prev.filter((n) => n.id !== id));
      },
      toggleNoteFav: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          const cur = notes.find((n) => n.id === id);
          await sb.from("notes").update({ favorite: !cur?.favorite }).eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)));
      },

      addMilestone: async (t) => {
        if (isSupabaseConfigured && sb && couple && user) {
          await sb.from("timeline_events").insert({ couple_id: couple.id, title: t.title, date: t.date, description: t.description, photo_url: t.photo_url, location_label: t.location_label, created_by: user.id });
          await fetchCoupleData(sb, user.id);
          return;
        }
        setTimeline((prev) => [...prev, { ...t, id: uid("t-"), couple_id: couple?.id ?? "couple-demo", created_at: new Date().toISOString() }]);
      },
      deleteMilestone: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          await sb.from("timeline_events").delete().eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setTimeline((prev) => prev.filter((t) => t.id !== id));
      },

      addPlace: async (p) => {
        if (isSupabaseConfigured && sb && couple && user) {
          await sb.from("places").insert({ couple_id: couple.id, name: p.name, description: p.description, lat: p.lat, lng: p.lng, date: p.date, photo_url: p.photo_url, memory_id: p.memory_id, created_by: user.id });
          await fetchCoupleData(sb, user.id);
          return;
        }
        setPlaces((prev) => [{ ...p, id: uid("p-"), couple_id: couple?.id ?? "couple-demo", created_at: new Date().toISOString() }, ...prev]);
      },
      deletePlace: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          await sb.from("places").delete().eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setPlaces((prev) => prev.filter((p) => p.id !== id));
      },

      addWish: async (title, category, note) => {
        if (isSupabaseConfigured && sb && couple && user) {
          await sb.from("wishlist_items").insert({ couple_id: couple.id, title, category, note, done: false, created_by: user.id });
          await fetchCoupleData(sb, user.id);
          return;
        }
        setWishlist((prev) => [{ id: uid("w-"), couple_id: couple?.id ?? "couple-demo", title, category, note, done: false, created_at: new Date().toISOString() }, ...prev]);
      },
      toggleWish: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          const cur = wishlist.find((w) => w.id === id);
          await sb.from("wishlist_items").update({ done: !cur?.done }).eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setWishlist((prev) => prev.map((w) => (w.id === id ? { ...w, done: !w.done } : w)));
      },
      deleteWish: async (id) => {
        if (isSupabaseConfigured && sb && user) {
          await sb.from("wishlist_items").delete().eq("id", id);
          await fetchCoupleData(sb, user.id);
          return;
        }
        setWishlist((prev) => prev.filter((w) => w.id !== id));
      },
    };
  }, [user, profile, partnerProfile, avatarUrl, partnerAvatarUrl, couple, memories, notes, timeline, places, wishlist, authLoading, dataLoading, isRecovery, role, profileLoading, avatarBusy, avatarError, theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
