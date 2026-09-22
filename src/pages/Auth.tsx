import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../components/ui/primitives";
import { Logo, Tape } from "../components/scrapbook/bits";
import { useApp } from "../store/AppContext";
import { isSupabaseConfigured } from "../lib/supabase";

function GoogleButton({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) {
  if (!isSupabaseConfigured) return null;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="touch w-full inline-flex items-center justify-center gap-2 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] px-4 text-[15px] font-bold text-[#4A423B] disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.8Z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.5 24 12 24Z" />
        <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.7 0 10.3 0 12s.5 3.3 1.4 4.7l3.8-2.3Z" />
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.6 1.4 6.3l3.8 3.4c1-2.9 3.7-5 6.8-5Z" />
      </svg>
      {busy ? "…" : label}
    </button>
  );
}

function Shell({ children, title, hand }: { children: React.ReactNode; title: string; hand: string }) {
  return (
    <div className="paper-grain min-h-dvh flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 pt-6"><Logo /></header>
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">
        <div className="relative bg-[#FFFDF7] border border-[#E5DAC6] p-6 pt-7 rotate-[-0.4deg]">
          <Tape className="left-1/2 -translate-x-1/2 -top-[11px]" />
          <h1 className="font-display text-[28px] font-semibold tracking-tight">{title}</h1>
          <p className="font-hand text-[21px] text-[#8A7F72] leading-tight mb-5">{hand}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Signup() {
  const { signUp, signInWithGoogle } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [agree, setAgree] = useState(false);

  if (confirmSent) {
    return (
      <Shell title="Check your inbox ♡" hand="one last little step">
        <p className="text-[15px] leading-relaxed text-[#4A423B]">
          We created your account and sent a confirmation link to <strong>{email}</strong>.
          Click it, then come back and log in.
        </p>
        <div className="mt-5">
          <Link to="/login" className="touch w-full inline-flex items-center justify-center bg-[#2B2622] text-[#FAF6EF] px-5 rounded-[3px] text-[15px] font-bold">
            Go to log in
          </Link>
        </div>
      </Shell>
    );
  }

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.includes("@")) return setErr("That email doesn't look right.");
    if (pw.length < 6) return setErr("Password needs at least 6 characters.");
    if (!agree) return setErr("Please agree to the Terms and acknowledge the Privacy Policy to continue.");
    setBusy(true); setErr("");
    const r = await signUp(email.trim(), pw, name.trim());
    setBusy(false);
    if (r.error) setErr(r.error);
    else if (r.needsConfirmation) setConfirmSent(true);
    else nav("/welcome");
  };

  return (
    <Shell title="Create your Twofold" hand="two lives, one story — start yours ♡">
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam" autoComplete="given-name" /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
        <Field label="Password" hint="8+ characters is plenty"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></Field>
        <p className="text-[13px] leading-relaxed text-[#4A423B]">
          By creating an account, you agree to the <Link to="/terms" target="_blank" rel="noreferrer" className="underline font-bold text-[#7D2E3B]">Terms of Service</Link> and acknowledge the{" "}
          <Link to="/privacy" target="_blank" rel="noreferrer" className="underline font-bold text-[#7D2E3B]">Privacy Policy</Link>. You must be 18 or older.
        </p>
        <label className="flex gap-2.5 items-start text-[13px] leading-relaxed text-[#4A423B] py-1">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-[#7D2E3B]"
          />
          <span>
            I agree to the <Link to="/terms" target="_blank" rel="noreferrer" className="underline font-bold text-[#7D2E3B]">Terms</Link> and
            acknowledge the <Link to="/privacy" target="_blank" rel="noreferrer" className="underline font-bold text-[#7D2E3B]">Privacy Policy</Link>.
          </span>
        </label>
        {err && <p className="text-[14px] font-semibold text-[#7D2E3B]" role="alert">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Making a little room…" : "Create our space"}</Button>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#B6AA99]">
          <span className="h-px flex-1 bg-[#E5DAC6]" /> or <span className="h-px flex-1 bg-[#E5DAC6]" />
        </div>
        <GoogleButton
          label="Continue with Google"
          busy={gBusy}
          onClick={async () => {
            setGBusy(true); setErr("");
            const r = await signInWithGoogle();
            setGBusy(false);
            if (r.error) setErr(r.error);
            // success → Supabase redirects to /home via OAuth flow
          }}
        />
        <p className="text-[14px] text-[#8A7F72] text-center">Already have one? <Link to="/login" className="font-bold text-[#7D2E3B] underline">Log in</Link></p>
      </form>
    </Shell>
  );
}

export function Login() {
  const { signIn, signInWithGoogle } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const r = await signIn(email.trim(), pw);
    setBusy(false);
    if (r.error) setErr(r.error);
    else nav("/home");
  };
  return (
    <Shell title="Welcome back" hand="your diary missed you">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
        <Field label="Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} /></Field>
        {err && <p className="text-[14px] font-semibold text-[#7D2E3B]" role="alert">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Opening…" : "Open our diary"}</Button>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#B6AA99]">
          <span className="h-px flex-1 bg-[#E5DAC6]" /> or <span className="h-px flex-1 bg-[#E5DAC6]" />
        </div>
        <GoogleButton
          label="Continue with Google"
          busy={gBusy}
          onClick={async () => {
            setGBusy(true); setErr("");
            const r = await signInWithGoogle();
            setGBusy(false);
            if (r.error) setErr(r.error);
          }}
        />
        <div className="flex items-center justify-between text-[14px]">
          <Link to="/reset" className="text-[#8A7F72] underline">Forgot password?</Link>
          <Link to="/signup" className="font-bold text-[#7D2E3B] underline">Create one</Link>
        </div>
        {!isSupabaseConfigured && (
          <p className="text-[12.5px] text-[#B6AA99] text-center leading-relaxed">Demo mode: any email works —<br />we'll open the sample story so you can look around.</p>
        )}
      </form>
    </Shell>
  );
}

/** True when the URL itself carries a recovery payload (PKCE ?code= or
 *  legacy #type=recovery). Used alongside the context recovery flag. */
function urlHasRecoveryPayload(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("code=") || window.location.hash.includes("type=recovery");
}

export function Reset() {
  const { resetPassword, updatePassword, signOut, isRecovery, user, authLoading } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [cameByLink] = useState(urlHasRecoveryPayload);
  // Failed verifications (expired/used links) redirect back with ?error=.
  const [linkError] = useState(
    () => typeof window !== "undefined" && /(^|[?&])error=/.test(window.location.search)
  );
  // Resend cooldown: Supabase throttles recovery emails (~1/min plus hourly
  // caps), so the button locks briefly after each send instead of letting
  // rapid taps trip the limit.
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const inRecovery = isRecovery || cameByLink;

  const sendLink = async () => {
    setErr("");
    setMsg("");
    if (!isSupabaseConfigured) {
      setErr("Password reset needs Supabase configured — you're in demo mode.");
      return;
    }
    if (!email.includes("@")) {
      setErr("That email doesn't look right.");
      return;
    }
    setBusy(true);
    const r = await resetPassword(email.trim());
    setBusy(false);
    if (r.error) setErr(r.error);
    else {
      setSent(true);
      setCooldown(60);
    }
  };

  if (done) {
    return (
      <Shell title="Password updated" hand="fresh start, same story ♡">
        <p className="text-[15px] leading-relaxed text-[#4A423B]">You can now log in with your new password.</p>
        <div className="mt-5">
          <Link to="/login" className="touch w-full inline-flex items-center justify-center bg-[#2B2622] text-[#FAF6EF] px-5 rounded-[3px] text-[15px] font-bold">
            Back to log in
          </Link>
        </div>
      </Shell>
    );
  }

  if (inRecovery) {
    if (authLoading && !linkError) {
      return (
        <Shell title="One moment…" hand="checking your reset link">
          <p className="font-hand text-[22px] text-[#8A7F72] animate-pulse">verifying…</p>
        </Shell>
      );
    }
    if (linkError || !user) {
      return (
        <Shell title="Link trouble" hand="that one won't open">
          <p className="text-[15px] leading-relaxed text-[#4A423B]">
            This reset link is invalid or has expired. Links are single-use — send yourself a fresh one.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button onClick={() => {
              window.history.replaceState(null, "", "/reset");
              window.location.reload();
            }}>Send a new link</Button>
            <p className="text-center text-[14px]"><Link to="/login" className="underline text-[#8A7F72]">Back to log in</Link></p>
          </div>
        </Shell>
      );
    }
    return (
      <Shell title="Create a new password" hand="almost back in ♡">
        <div className="flex flex-col gap-4">
          <Field label="New password" hint="6+ characters"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></Field>
          <Field label="Confirm password"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></Field>
          {err && <p className="text-[14px] font-semibold text-[#7D2E3B]">{err}</p>}
          <Button disabled={busy} onClick={async () => {
            if (!pw) return setErr("Enter a new password first.");
            if (pw.length < 6) return setErr("Password needs at least 6 characters.");
            if (pw !== pw2) return setErr("Those passwords don't match — try again?");
            setBusy(true); setErr("");
            const r = await updatePassword(pw);
            setBusy(false);
            if (r.error) setErr(r.error);
            else {
              setPw("");
              setPw2("");
              setDone(true);
            }
          }}>{busy ? "Updating…" : "Update password"}</Button>
          <p className="text-center text-[14px]">
            <button
              className="underline text-[#8A7F72]"
              onClick={async () => {
                await signOut();
                nav("/login");
              }}
            >
              Use a different account? Log out
            </button>
          </p>
        </div>
      </Shell>
    );
  }

  if (linkError) {
    // Verification failed before any recovery session existed (expired or
    // already-used link). Same invalid panel as above, without a session.
    return (
      <Shell title="Link trouble" hand="that one won't open">
        <p className="text-[15px] leading-relaxed text-[#4A423B]">
          This reset link is invalid or has expired. Links are single-use — send yourself a fresh one.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={() => {
            window.history.replaceState(null, "", "/reset");
            window.location.reload();
          }}>Send a new link</Button>
          <p className="text-center text-[14px]"><Link to="/login" className="underline text-[#8A7F72]">Back to log in</Link></p>
        </div>
      </Shell>
    );
  }

  if (sent) {
    return (
      <Shell title="Check your inbox" hand="it's on its way ♡">
        <p className="text-[15px] leading-relaxed text-[#4A423B]">
          We sent a password reset link{email ? <> for <strong>{email}</strong></> : null}.
          Click it, then come back and choose a new password.
        </p>
        {err && <p className="mt-3 text-[14px] font-semibold text-[#7D2E3B]">{err}</p>}
        <div className="mt-5 flex flex-col gap-3">
          <Button disabled={busy || cooldown > 0} onClick={sendLink}>
            {busy ? "Sending…" : cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
          </Button>
          <p className="text-center text-[14px]"><Link to="/login" className="underline text-[#8A7F72]">Back to log in</Link></p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Reset password" hand="we'll send you a way back in">
      <div className="flex flex-col gap-4">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
        {msg && <p className="text-[14px] font-semibold text-[#6B7F5E]">{msg}</p>}
        {err && <p className="text-[14px] font-semibold text-[#7D2E3B]">{err}</p>}
        <Button disabled={busy || cooldown > 0} onClick={sendLink}>
          {busy ? "Sending…" : cooldown > 0 ? `Send again in ${cooldown}s` : "Send reset link"}
        </Button>
        <p className="text-center text-[14px]"><Link to="/login" className="underline text-[#8A7F72]">Back to log in</Link></p>
      </div>
    </Shell>
  );
}
