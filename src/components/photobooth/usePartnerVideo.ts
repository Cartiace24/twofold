import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type PVStatus = "idle" | "connecting" | "connected" | "unavailable" | "interrupted";

/** Ephemeral WebRTC signaling over Supabase Realtime broadcast — no video
 *  ever touches Supabase, and no signaling rows are stored. Scoped to one
 *  photobooth session; senders outside the couple's two participants are
 *  ignored (only members can even learn the session id, via RLS). */
interface SignalMsg {
  v: 1;
  /** Setup generation — stale messages from a previous attempt are dropped. */
  g: number;
  from: string;
  kind: "hello" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Public STUN for NAT traversal. No TURN backend exists in this project, so
// symmetric-NAT pairs will fail gracefully to "unavailable" — synchronized
// capture keeps working regardless.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const CONNECT_TIMEOUT_MS = 20_000;
const MAX_AUTO_RESTARTS = 1;

function pvlog(event: string, extra?: Record<string, unknown>) {
  if (typeof console === "undefined") return;
  // Never log SDP/ICE contents — kinds and counts only.
  // eslint-disable-next-line no-console
  console.info("[LongDistance][WebRTC]", event, extra ?? {});
}

export function usePartnerVideo(args: {
  sb: SupabaseClient | null;
  sessionId: string | null;
  userId: string | null;
  /** The other participant's user id — unknown senders are ignored. */
  peerUserId: string | null;
  /** Deterministic initiator: the session creator offers, partner answers. */
  isInitiator: boolean;
  getLocalStream: () => MediaStream | null;
  /** False when there is no live session — tears everything down. */
  active: boolean;
}) {
  const { sb, sessionId, userId, peerUserId, isInitiator, getLocalStream, active } = args;
  const [partnerStream, setPartnerStream] = useState<MediaStream | null>(null);
  const [pvStatus, setPvStatus] = useState<PVStatus>("idle");
  const [nonce, setNonce] = useState(0);
  const [pcDiag, setPcDiag] = useState({ connection: "new", ice: "new", signaling: "stable" });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const partnerStreamRef = useRef<MediaStream | null>(null);
  partnerStreamRef.current = partnerStream;
  const chRef = useRef<RealtimeChannel | null>(null);
  const genRef = useRef(0);
  const helloSeenRef = useRef(false);
  const offeredRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const autoRestartsRef = useRef(0);
  const localRef = useRef(getLocalStream);
  localRef.current = getLocalStream;

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  /** Full peer-connection introspection for the A/B/C/D diagnosis. */
  const diagPc = useCallback(
    (tag: string) => {
      const pc = pcRef.current;
      if (!pc) {
        pvlog(tag, { noPc: true });
        return;
      }
      pvlog(tag, {
        role: isInitiator ? "creator" : "partner",
        peerUserId,
      connectionState: pc.connectionState,
      signalingState: pc.signalingState,
      iceConnectionState: pc.iceConnectionState,
      senderCount: pc.getSenders().length,
      senders: pc.getSenders().map((s) => ({
        kind: s.track?.kind ?? null,
        trackId: s.track?.id ?? null,
        readyState: s.track?.readyState ?? null,
      })),
      receiverCount: pc.getReceivers().length,
      receivers: pc.getReceivers().map((r) => ({
        kind: r.track?.kind ?? null,
        trackId: r.track?.id ?? null,
        readyState: r.track?.readyState ?? null,
      })),
      ontrackAttached: !!pc.ontrack,
      partnerStreamInState: !!partnerStreamRef.current,
      partnerStreamId: partnerStreamRef.current?.id ?? null,
    });
  }, [isInitiator, peerUserId]);

  /** Fallback: adopt a live remote video receiver track straight into
   *  partnerStream when `ontrack` never delivers it (some browsers/timing
   *  expose the receiver without firing the event). Same state path as the
   *  normal handler — never creates a new peer connection. */
  const adoptReceiverStream = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") return false;
    if (partnerStreamRef.current) return true;
    const recv = pc
      .getReceivers()
      .find((r) => r.track && r.track.kind === "video" && r.track.readyState === "live");
    const track = recv?.track ?? null;
    if (!track) return false;
    const stream = new MediaStream([track]);
    setPartnerStream(stream);
    setPvStatus("connected");
    pvlog("receiver fallback used", { via: "getReceivers", trackId: track.id });
    return true;
  }, []);

  /** Attach the current local video track (or swap it after a camera flip)
   *  without renegotiating the whole connection. */
  const refreshLocal = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") return;
    const stream = localRef.current();
    const track = stream?.getVideoTracks()[0] ?? null;
    if (!track || !stream) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) {
      try {
        pc.addTrack(track, stream);
        pvlog("local video sender added", {
          kind: track.kind,
          trackId: track.id,
          readyState: track.readyState,
        });
      } catch {
        /* pc is closing */
      }
      return;
    }
    if (sender.track?.id === track.id) return;
    void sender.replaceTrack(track).then(
      () => pvlog("local track replaced"),
      () => pvlog("local track replace failed")
    );
  }, []);

  useEffect(() => {
    if (!sb || !sessionId || !userId || !peerUserId || !active) return;
    const gen = ++genRef.current;
    helloSeenRef.current = false;
    offeredRef.current = false;
    pendingIceRef.current = [];
    setPvStatus("connecting");
    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let timeout: number | undefined;

    const send = (msg: Omit<SignalMsg, "v" | "g" | "from">) => {
      const ch = chRef.current;
      if (!ch || cancelled || gen !== genRef.current) return;
      const full: SignalMsg = { v: 1, g: gen, from: userId, ...msg };
      if (msg.kind === "ice") pvlog("ICE candidate sent");
      else pvlog(`${msg.kind} sent`);
      void ch.send({ type: "broadcast", event: "signal", payload: full });
    };

    const flushIce = async () => {
      if (!pc || !pc.remoteDescription || cancelled || gen !== genRef.current) return;
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          /* stale after restart */
        }
      }
    };

    const handleSignal = async (msg: SignalMsg) => {
      if (cancelled || gen !== genRef.current || !pc) return;
      if (!msg || msg.v !== 1 || msg.g !== gen) return;
      // Only the known peer, never ourselves or strangers.
      if (msg.from === userId || msg.from !== peerUserId) return;
      if (msg.kind === "hello") {
        pvlog("hello received");
        if (!helloSeenRef.current) {
          helloSeenRef.current = true;
          send({ kind: "hello" }); // exactly one reply — never a ping loop
        }
        if (isInitiator && !offeredRef.current && pc.signalingState === "stable") {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (cancelled || gen !== genRef.current) return;
            offeredRef.current = true;
            send({ kind: "offer", sdp: { type: offer.type, sdp: offer.sdp ?? "" } });
            pvlog("offer created");
            diagPc("after offer created");
          } catch {
            /* retry covers */
          }
        }
        return;
      }
      if (msg.kind === "offer") {
        // Symmetric re-offers with polite-peer glare handling: the partner
        // (polite) rolls back a pending local offer on collision, while the
        // creator (impolite) ignores incoming offers mid-flight. Either side
        // may therefore renegotiate a late camera track — no deadlock.
        if (!msg.sdp) return;
        if (isInitiator && pc.signalingState !== "stable") return;
        if (!isInitiator && pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer")
          return;
        pvlog("offer received");
        try {
          if (!isInitiator && pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
            pvlog("offer collision, rolled back local offer");
          }
          await pc.setRemoteDescription(msg.sdp);
          diagPc("after offer applied");
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (cancelled || gen !== genRef.current) return;
          send({ kind: "answer", sdp: { type: answer.type, sdp: answer.sdp ?? "" } });
          pvlog("answer created");
          diagPc("after answer created");
        } catch {
          /* retry covers */
        }
        return;
      }
      if (msg.kind === "answer") {
        if (!isInitiator || !msg.sdp || pc.signalingState !== "have-local-offer") return;
        pvlog("answer received");
        try {
          await pc.setRemoteDescription(msg.sdp);
          await flushIce();
          diagPc("after answer applied");
          adoptReceiverStream();
        } catch {
          /* ignore */
        }
        return;
      }
      if (msg.kind === "ice") {
        if (!msg.candidate) return;
        pvlog("ICE candidate received");
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch {
            /* ignore */
          }
        } else {
          pendingIceRef.current.push(msg.candidate);
        }
      }
    };

    pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    const local = localRef.current();
    local?.getVideoTracks().forEach((tr) => {
      try {
        pc!.addTrack(tr, local);
        pvlog("local video sender added", {
          kind: tr.kind,
          trackId: tr.id,
          readyState: tr.readyState,
        });
      } catch {
        /* pc is closing */
      }
    });
    diagPc("pc setup");

    pc.onicecandidate = (e) => {
      if (cancelled || gen !== genRef.current) return;
      if (e.candidate) send({ kind: "ice", candidate: e.candidate.toJSON() });
    };
    // Late local tracks (camera came up after the first offer): either side
    // may renegotiate while stable; glare is resolved by the polite-peer
    // offer handling above. Camera flips use replaceTrack and never reach
    // this path.
    pc.onnegotiationneeded = () => {
      void (async () => {
        if (cancelled || gen !== genRef.current || !pc) return;
        if (pc.signalingState !== "stable") return;
        // Note: deliberately does NOT set offeredRef — that flag belongs to
        // the hello handshake, which must still fire when the peer arrives.
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (cancelled || gen !== genRef.current) return;
          send({ kind: "offer", sdp: { type: offer.type, sdp: offer.sdp ?? "" } });
          pvlog("offer created");
          diagPc("after offer created (renegotiation)");
        } catch {
          /* retry covers */
        }
      })();
    };
    pc.ontrack = (e) => {
      // Fired-log comes first so a silent guard-drop (A) is distinguishable
      // from streams-empty (B) and from set-but-cleared (D).
      pvlog("ontrack fired", {
        eventTrackKind: e.track?.kind ?? null,
        eventTrackId: e.track?.id ?? null,
        eventTrackState: e.track?.readyState ?? null,
        streamsLength: e.streams?.length ?? 0,
        streamId: e.streams?.[0]?.id ?? null,
      });
      if (cancelled || gen !== genRef.current) {
        pvlog("ontrack ignored", {
          reason: cancelled ? "effect cancelled" : "stale generation",
          gen,
          currentGen: genRef.current,
        });
        return;
      }
      const [s] = e.streams;
      if (!s) {
        // Event without a stream wrapper: adopt the bare track directly.
        const track = e.track && e.track.kind === "video" ? e.track : null;
        if (track && track.readyState === "live") {
          const stream = new MediaStream([track]);
          setPartnerStream(stream);
          setPvStatus("connected");
          pvlog("receiver fallback used", { via: "bare-track", trackId: track.id });
          pvlog("remote stream state updated", { intendedStreamId: stream.id });
        } else {
          pvlog("ontrack no stream, skipping state");
        }
        return;
      }
      pvlog("remote track received", {
        streamId: s.id,
        streamTrackCount: s.getTracks().length,
        videoTracks: s.getVideoTracks().map((tr) => ({
          kind: tr.kind,
          trackId: tr.id,
          readyState: tr.readyState,
        })),
      });
      setPartnerStream(s);
      setPvStatus("connected");
      pvlog("remote stream state updated", { intendedStreamId: s.id });
      diagPc("after ontrack");
    };
    pc.onsignalingstatechange = () => {
      if (cancelled || gen !== genRef.current || !pc) return;
      setPcDiag((d) => ({ ...d, signaling: pc.signalingState }));
    };
    pc.oniceconnectionstatechange = () => {
      if (cancelled || gen !== genRef.current || !pc) return;
      setPcDiag((d) => ({ ...d, ice: pc.iceConnectionState }));
    };
    pc.onconnectionstatechange = () => {
      if (cancelled || gen !== genRef.current || !pc) return;
      const st = pc.connectionState;
      setPcDiag((d) => ({ ...d, connection: st }));
      pvlog("connection state changed", { state: st });
      diagPc("connection state");
      if (st === "connected") {
        autoRestartsRef.current = 0;
        window.clearTimeout(timeout);
        setPvStatus("connected");
        // ontrack is primary; this only fills the gap when the event never
        // fires despite live remote media (no-op when stream already set).
        adoptReceiverStream();
      } else if (st === "disconnected") {
        setPvStatus("interrupted");
      } else if (st === "failed" || st === "closed") {
        if (autoRestartsRef.current < MAX_AUTO_RESTARTS) {
          autoRestartsRef.current += 1;
          pvlog("reconnect attempt");
          setNonce((n) => n + 1);
        } else {
          setPvStatus("unavailable");
          pvlog("connection failure");
        }
      }
    };

    const ch = sb.channel(`photobooth-webrtc:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    chRef.current = ch;
    ch.on("broadcast", { event: "signal" }, ({ payload }) => {
      void handleSignal(payload as SignalMsg);
    });
    ch.subscribe((status) => {
      if (cancelled || gen !== genRef.current) return;
      if (status === "SUBSCRIBED") {
        pvlog("signaling channel subscribed");
        send({ kind: "hello" });
        timeout = window.setTimeout(() => {
          if (gen !== genRef.current) return;
          setPvStatus((prev) => (prev === "connected" ? prev : "unavailable"));
        }, CONNECT_TIMEOUT_MS);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      pvlog("cleanup", {
        hadActivePartnerStream: !!partnerStreamRef.current,
        clearedStreamId: partnerStreamRef.current?.id ?? null,
      });
      try {
        if (chRef.current) void sb.removeChannel(chRef.current);
      } catch {
        /* already gone */
      }
      chRef.current = null;
      try {
        pc?.close();
      } catch {
        /* already closed */
      }
      if (pcRef.current === pc) pcRef.current = null;
      pendingIceRef.current = [];
      setPartnerStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, sessionId, userId, peerUserId, isInitiator, active, nonce]);

  return { partnerStream, pvStatus, retry, refreshLocal, pcDiag };
}
