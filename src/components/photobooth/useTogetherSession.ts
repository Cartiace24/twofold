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

/** Merge a server row into local session state with two protections:
 *  1. Photos are write-once per round (null → data): a stale server null
 *     never clears a locally-known photo. Only an explicit local retake
 *     nulls them (see the retake_requested processing in TogetherBooth).
 *  2. Capture-cycle ordering: capture_at identifies the cycle. A row from
 *     an older cycle (e.g. a delayed round-1 `complete` echo arriving
 *     during a round-2 `countdown`) must not move the active cycle
 *     backwards — its status/capture_at are rejected, everything else
 *     still merges. Compared as instants, not strings: the optimistic
 *     write (`...Z`) and the server echo (`...+00:00`) can spell the same
 *     instant differently, and a string compare would false-positive. */
function mergeRow(prev: PhotoboothSession | null, server: PhotoboothSession): PhotoboothSession {
  if (!prev || prev.id !== server.id) return server;
  const merged: PhotoboothSession = {
    ...server,
    creator_photo: server.creator_photo ?? prev.creator_photo,
    partner_photo: server.partner_photo ?? prev.partner_photo,
  };
  const curCap = prev.capture_at;
  const inCap = server.capture_at;
  if (curCap && inCap && curCap !== inCap) {
    const curT = Date.parse(curCap);
    const inT = Date.parse(inCap);
    if (Number.isFinite(curT) && Number.isFinite(inT)) {
      if (inT < curT) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] stale session update ignored", {
            incomingStatus: server.status,
            incomingCaptureAt: inCap,
            currentStatus: prev.status,
            currentCaptureAt: curCap,
            reason: "older capture cycle",
          });
        }
        merged.status = prev.status;
        merged.capture_at = prev.capture_at;
      } else if (inT === curT) {
        // Same instant, different spelling (optimistic vs server echo):
        // keep the local spelling so downstream string guards don't flap.
        merged.capture_at = prev.capture_at;
      }
    }
  }
  return merged;
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

  const markReady = useCallback(async (): Promise<boolean> => {
    const s = sessionRef.current;
    if (!sb || !s || !role || !userId) return false;
    // Role decides the column — creator reports creator_ready, partner
    // reports partner_ready, never both from one client.
    const column = role === "creator" ? "creator_ready" : "partner_ready";
    const patch =
      role === "creator"
        ? { creator_ready: true, creator_seen_at: nowISO() }
        : { partner_ready: true, partner_seen_at: nowISO() };
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] reporting local camera ready");
      // eslint-disable-next-line no-console
      console.info("[LongDistance] ready payload", { ...patch, column, role });
      // eslint-disable-next-line no-console
      console.info("[LongDistance] ready update started", {
        sessionId: s.id,
        userId,
        coupleId,
        status: s.status,
      });
    }
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
    // .select() verifies the row actually exists: a zero-row update
    // (deleted/expired session) otherwise resolves with no error.
    const { data, error } = await sb
      .from("photobooth_sessions")
      .update(patch)
      .eq("id", s.id)
      .select("id");
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] ready update succeeded", {
        ok: !error,
        rows: data?.length ?? 0,
        error: error
          ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
          : null,
      });
      // eslint-disable-next-line no-console
      console.info("[LongDistance] ready update returned row", { rows: data?.length ?? 0 });
    }
    if (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] ready update FAILED", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
      setError(`Couldn't report camera readiness — ${error.message} Try again?`);
      return false;
    }
    if (!data || data.length === 0) {
      // The session row is gone server-side (ended/expired/deleted) while
      // this client still holds it — staying in camera view can never
      // converge, so say so explicitly instead of wedging silently.
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] ready update FAILED", { message: "zero rows updated" });
      }
      setError("This session no longer exists — ask your person to start a new one?");
      return false;
    }
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] local ready confirmed from server", { column });
    }
    return true;
  }, [sb, role, userId, coupleId]);

  const startCountdown = useCallback(async () => {
    const s = sessionRef.current;
    if (!sb || !s) return false;
    // Shared future capture moment — both devices count down to the same
    // timestamp on their own clocks (approx sync, no "capture now" race).
    const captureAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();
    // Accept joined as well as ready: joined + both-ready flags is
    // semantically both-ready, so a late 'ready' label can't wedge capture.
    const { data, error } = await sb
      .from("photobooth_sessions")
      .update({ status: "countdown", capture_at: captureAt })
      .eq("id", s.id)
      .in("status", ["joined", "ready"])
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
      // A retake (or end) mid-upload discards the round: never write a
      // photo into a session that already moved on.
      if (s.status !== "countdown") return false;
      const patch =
        role === "creator"
          ? { creator_photo: dataUrl, creator_seen_at: nowISO() }
          : { partner_photo: dataUrl, partner_seen_at: nowISO() };
      setSession((prev) => (prev ? { ...prev, ...patch } : prev));
      const { error } = await sb.from("photobooth_sessions").update(patch).eq("id", s.id);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Session update:", {
          role,
          ok: !error,
          photoChars: dataUrl.length,
          error: error?.message ?? null,
        });
      }
      if (error) {
        setError("Couldn't upload your photo — check connection and try retake?");
        return false;
      }
      return true;
    },
    [sb, role]
  );

  /** Explicit local photo clear for a confirmed retake: the ONE sanctioned
   *  exception to mergeRow's photo protection. Without this, round-1
   *  photos preserved locally would satisfy the complete-promotion during
   *  the round-2 countdown and wedge the new cycle with a stale complete. */
  const clearPhotosForRetake = useCallback(() => {
    setSession((prev) =>
      prev ? { ...prev, creator_photo: null, partner_photo: null } : prev
    );
  }, []);

  /** Explicit synchronized retake: clears both photos + ready flags and
   *  moves the shared session to retake_requested. Transactional from the
   *  UI's perspective — nothing local transitions until the server write
   *  is confirmed, so a failed write leaves the current state stable with
   *  a retryable error instead of a half-reset session. */
  const requestRetake = useCallback(async (): Promise<boolean> => {
    const s = sessionRef.current;
    if (!sb || !s || !userId || !coupleId) return false;
    const at = nowISO();
    const patch = {
      status: "retake_requested" as const,
      creator_photo: null,
      partner_photo: null,
      capture_at: null,
      creator_ready: false,
      partner_ready: false,
      retake_at: at,
      retake_by: myName.slice(0, 40),
    };
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake requested");
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake payload:", patch);
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake session ID:", s.id);
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake user ID:", userId);
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake Supabase update started");
    }
    const { data, error } = await sb
      .from("photobooth_sessions")
      .update(patch)
      .eq("id", s.id)
      .select();
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake Supabase response:", {
        rows: data?.length ?? 0,
        error: error
          ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
          : null,
      });
    }
    if (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Retake error:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
      // Surface the real reason (e.g. check-constraint vs RLS) — the raw
      // message names it, which is exactly what a retest needs to report.
      setError(`Couldn't send the retake — ${error.message} Try again?`);
      return false;
    }
    if (!data || data.length === 0) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Retake error:", { message: "zero rows updated" });
      }
      setError("Couldn't send the retake — session not found. Try again?");
      return false;
    }
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Retake update succeeded");
    }
    // Confirmed: adopt the server row; the retake_requested echo drives
    // the return-to-camera on this side exactly like the partner's side.
    setSession(data[0] as PhotoboothSession);
    return true;
  }, [sb, userId, coupleId, myName]);

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
        (payload) => {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.info("[LongDistance] realtime event received", {
              event: "UPDATE",
              status: (payload.new as PhotoboothSession)?.status,
            });
          }
          setSession((prev) => mergeRow(prev, payload.new as PhotoboothSession));
        }
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
  // Retried on an interval while the condition holds: if the first write
  // is lost (flaky mobile data), the session must not wedge in "joined".

  useEffect(() => {
    if (!sb || !session) return;
    if (
      !(session.creator_ready && session.partner_ready) ||
      !["joined", "retake_requested"].includes(session.status)
    )
      return;
    let cancelled = false;
    const promote = async () => {
      const { error } = await sb
        .from("photobooth_sessions")
        .update({ status: "ready" })
        .eq("id", session.id)
        .in("status", ["joined", "retake_requested"]);
      if (!cancelled && error) setError(`Sync hiccup: ${error.message}`);
    };
    void promote();
    const id = window.setInterval(promote, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sb, session]);

  useEffect(() => {
    if (!sb || !session) return;
    if (!(session.creator_photo && session.partner_photo && session.status === "countdown")) return;
    let cancelled = false;
    const promote = async () => {
      const { error } = await sb
        .from("photobooth_sessions")
        .update({ status: "complete" })
        .eq("id", session.id)
        .eq("status", "countdown");
      if (!cancelled && error) setError(`Sync hiccup: ${error.message}`);
    };
    void promote();
    const id = window.setInterval(promote, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sb, session]);

  // ---- backstop polling while the session is live ----
  // Realtime is primary, but row updates carrying a half-megabyte photo can
  // go missing on flaky mobile data. While the session is active, re-read
  // the row every few seconds and merge anything realtime didn't deliver.
  useEffect(() => {
    if (!sb || !session) return;
    // retake_requested included: re-reported readiness after a retake must
    // also converge when realtime drops it — same backstop, no new system.
    if (!["joined", "ready", "countdown", "retake_requested"].includes(session.status)) return;
    const id = window.setInterval(async () => {
      try {
        const { data } = await sb
          .from("photobooth_sessions")
          .select("*")
          .eq("id", session.id)
          .maybeSingle();
        if (!data) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.info("[LongDistance] session missing on server", { sessionId: session.id });
          }
          return;
        }
        const server = data as PhotoboothSession;
        const cur = sessionRef.current;
        if (!cur || cur.id !== server.id) return;
        const sig = (s: PhotoboothSession) =>
          [
            s.status,
            s.creator_ready,
            s.partner_ready,
            s.capture_at,
            s.retake_at,
            s.creator_photo?.length ?? 0,
            s.partner_photo?.length ?? 0,
            s.creator_seen_at,
            s.partner_seen_at,
          ].join("|");
        if (sig(server) !== sig(cur)) setSession((prev) => mergeRow(prev, server));
      } catch {
        /* realtime remains the primary channel */
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [sb, session?.id, session?.status]);

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
    requestRetake,
    clearPhotosForRetake,
    endSession,
    leaveQuietly,
    retryLink,
    clearEnded: () => setEnded(null),
  };
}
