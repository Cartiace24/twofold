import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoboothSession } from "../../lib/types";

export type TogetherRole = "creator" | "partner";
export type EndedReason = "left" | "ended" | "expired" | null;

const HEARTBEAT_MS = 10_000;
const STALE_MS = 35_000;
const COUNTDOWN_MS = 4_000;

export function isExpired(s: PhotoboothSession): boolean {
  return new Date(s.expires_at).getTime() <= Date.now();
}

/** True when the other side hasn't been seen recently (no presence infra —
 *  just last-seen heartbeats). Non-destructive: callers only show a note. */
export function partnerStale(s: PhotoboothSession, role: TogetherRole): boolean {
  if (!["joined", "ready", "countdown"].includes(s.status)) return false;
  const seen = role === "creator" ? s.partner_seen_at : s.creator_seen_at;
  if (!seen) return true;
  return Date.now() - new Date(seen).getTime() > STALE_MS;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Owns one long-distance photobooth session: create / join / ready /
 *  countdown / photo columns, all synced through Supabase Realtime on the
 *  session row. State transitions that two clients can race (ready,
 *  countdown, complete) use conditional writes — exactly one wins and the
 *  loser follows via realtime. */
export function useTogetherSession(
  sb: SupabaseClient | null,
  coupleId: string | null,
  userId: string | null,
  myName: string
) {
  const [session, setSession] = useState<PhotoboothSession | null>(null);
  const [invites, setInvites] = useState<PhotoboothSession[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState<EndedReason>(null);
  const [linkOk, setLinkOk] = useState(true);
  const [chanNonce, setChanNonce] = useState(0);
  const sessionRef = useRef<PhotoboothSession | null>(null);
  sessionRef.current = session;

  const role: TogetherRole | null =
    !session || !userId ? null : session.created_by === userId ? "creator" : "partner";

  const ready = !!sb && !!coupleId && !!userId;

  const refreshInvites = useCallback(async () => {
    if (!ready || !sb || !coupleId || !userId) return;
    const { data } = await sb
      .from("photobooth_sessions")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("status", "waiting")
      .gt("expires_at", nowISO())
      .neq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setInvites((data ?? []) as PhotoboothSession[]);
  }, [ready, sb, coupleId, userId]);

  // ---- actions ----

  const createSession = useCallback(
    async (presetId: string) => {
      if (!ready || !sb || !coupleId || !userId) return;
      setBusy(true);
      setError("");
      try {
        const { data, error } = await sb
          .from("photobooth_sessions")
          .insert({
            couple_id: coupleId,
            created_by: userId,
            creator_name: myName.slice(0, 40),
            preset_id: presetId,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        setSession(data as PhotoboothSession);
        setEnded(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't start the session — try again?");
      } finally {
        setBusy(false);
      }
    },
    [ready, sb, coupleId, userId, myName]
  );

  const joinSession = useCallback(
    async (id: string) => {
      if (!ready || !sb || !userId) return;
      setBusy(true);
      setError("");
      try {
        const { data, error } = await sb
          .from("photobooth_sessions")
          .update({
            partner_id: userId,
            partner_name: myName.slice(0, 40),
            joined_at: nowISO(),
            partner_seen_at: nowISO(),
            status: "joined",
          })
          .eq("id", id)
          .eq("status", "waiting")
          .select();
        if (error) throw new Error(error.message);
        const row = (data ?? [])[0] as PhotoboothSession | undefined;
        if (!row) {
          setError("That session already started or expired.");
          await refreshInvites();
          return;
        }
        setSession(row);
        setEnded(null);
        setInvites((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't join — try again?");
      } finally {
        setBusy(false);
      }
    },
    [ready, sb, userId, myName, refreshInvites]
  );

  const dismissInvite = useCallback((id: string) => {
    setInvites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const markReady = useCallback(async () => {
    const s = sessionRef.current;
    if (!sb || !s || !role) return;
    const patch =
      role === "creator"
        ? { creator_ready: true, creator_seen_at: nowISO() }
        : { partner_ready: true, partner_seen_at: nowISO() };
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
    await sb.from("photobooth_sessions").update(patch).eq("id", s.id);
  }, [sb, role]);

  const startCountdown = useCallback(async () => {
    const s = sessionRef.current;
    if (!sb || !s) return false;
    // Shared future capture moment — both devices count down to the same
    // timestamp on their own clocks (approx sync, no "capture now" race).
    const captureAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();
    const { data, error } = await sb
      .from("photobooth_sessions")
      .update({ status: "countdown", capture_at: captureAt })
      .eq("id", s.id)
      .eq("status", "ready")
      .select();
    if (error) {
      setError("Couldn't start the countdown — try again?");
      return false;
    }
    if ((data ?? []).length > 0) {
      setSession((prev) => (prev ? { ...prev, status: "countdown", capture_at: captureAt } : prev));
      return true;
    }
    // Someone else started it — realtime will deliver the countdown.
    // Return false so the caller can stand by instead of assuming success.
    return false;
  }, [sb]);

  const uploadPhoto = useCallback(
    async (dataUrl: string) => {
      const s = sessionRef.current;
      if (!sb || !s || !role) return false;
      const patch =
        role === "creator"
          ? { creator_photo: dataUrl, creator_seen_at: nowISO() }
          : { partner_photo: dataUrl, partner_seen_at: nowISO() };
      setSession((prev) => (prev ? { ...prev, ...patch } : prev));
      const { error } = await sb.from("photobooth_sessions").update(patch).eq("id", s.id);
      if (error) {
        setError("Couldn't upload your photo — check connection and try retake?");
        return false;
      }
      return true;
    },
    [sb, role]
  );

  const retake = useCallback(async () => {
    const s = sessionRef.current;
    if (!sb || !s) return;
    const patch = {
      creator_photo: null,
      partner_photo: null,
      capture_at: null,
      status: "ready" as const,
    };
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
    await sb.from("photobooth_sessions").update(patch).eq("id", s.id);
  }, [sb]);

  const endSession = useCallback(async () => {
    const s = sessionRef.current;
    if (sb && s) {
      await sb.from("photobooth_sessions").delete().eq("id", s.id);
    }
    setSession(null);
    setEnded("left");
  }, [sb]);

  /** Best-effort leave when navigating away mid-session: cancel an empty
   *  lobby, otherwise just mark myself not-ready so my person isn't stuck. */
  const leaveQuietly = useCallback(async () => {
    const s = sessionRef.current;
    if (!sb || !s || !userId) return;
    try {
      if (s.status === "waiting" && s.created_by === userId) {
        await sb.from("photobooth_sessions").delete().eq("id", s.id);
      } else if (s.status !== "complete") {
        const patch =
          s.created_by === userId
            ? { creator_ready: false, creator_seen_at: nowISO() }
            : { partner_ready: false, partner_seen_at: nowISO() };
        await sb.from("photobooth_sessions").update(patch).eq("id", s.id);
      }
    } catch {
      /* best effort */
    }
  }, [sb, userId]);

  // ---- realtime: session row ----

  useEffect(() => {
    if (!sb || !session?.id) return;
    const id = session.id;
    const ch = sb
      .channel(`together-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "photobooth_sessions", filter: `id=eq.${id}` },
        (payload) => setSession(payload.new as PhotoboothSession)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "photobooth_sessions", filter: `id=eq.${id}` },
        () => {
          setSession(null);
          setEnded("ended");
        }
      )
      .subscribe((status) => {
        setLinkOk(status === "SUBSCRIBED");
      });
    return () => {
      void sb.removeChannel(ch);
    };
  }, [sb, session?.id, chanNonce]);

  // ---- realtime: open invites for the partner ----

  useEffect(() => {
    if (!sb || !coupleId || session) return;
    void refreshInvites();
    const ch = sb
      .channel(`together-invites-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photobooth_sessions", filter: `couple_id=eq.${coupleId}` },
        () => {
          void refreshInvites();
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, coupleId, !!session, chanNonce]);

  // ---- derived transitions (idempotent; exactly one client wins) ----

  useEffect(() => {
    if (!sb || !session) return;
    if (session.creator_ready && session.partner_ready && session.status === "joined") {
      void sb
        .from("photobooth_sessions")
        .update({ status: "ready" })
        .eq("id", session.id)
        .eq("status", "joined");
    }
  }, [sb, session]);

  useEffect(() => {
    if (!sb || !session) return;
    if (session.creator_photo && session.partner_photo && session.status === "countdown") {
      void sb
        .from("photobooth_sessions")
        .update({ status: "complete" })
        .eq("id", session.id)
        .eq("status", "countdown");
    }
  }, [sb, session]);

  // ---- heartbeat so the other side can tell I'm still here ----

  useEffect(() => {
    if (!sb || !session || !role) return;
    if (!["joined", "ready", "countdown"].includes(session.status)) return;
    const id = setInterval(() => {
      const patch =
        role === "creator" ? { creator_seen_at: nowISO() } : { partner_seen_at: nowISO() };
      void sb.from("photobooth_sessions").update(patch).eq("id", session.id);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [sb, session?.id, session?.status, role]);

  // ---- expiry ----

  useEffect(() => {
    if (!session || !isExpired(session)) return;
    void (async () => {
      if (sb) {
        try {
          await sb.from("photobooth_sessions").delete().eq("id", session.id);
        } catch {
          /* best effort */
        }
      }
      setSession(null);
      setEnded("expired");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.expires_at]);

  const retryLink = useCallback(() => setChanNonce((n) => n + 1), []);

  return {
    session,
    role,
    invites,
    busy,
    error,
    ended,
    linkOk,
    createSession,
    joinSession,
    dismissInvite,
    refreshInvites,
    markReady,
    startCountdown,
    uploadPhoto,
    retake,
    endSession,
    leaveQuietly,
    retryLink,
    clearEnded: () => setEnded(null),
  };
}
