import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../components/ui/primitives";
import { Logo, Tape } from "../components/scrapbook/bits";
import { useApp } from "../store/AppContext";
import { todayISO } from "../lib/format";

export default function Onboarding() {
  const { createCouple, joinCouple, user } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [name, setName] = useState("You & Mia");
  const [since, setSince] = useState("2022-04-15");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="paper-grain min-h-dvh">
      <header className="max-w-md mx-auto px-4 pt-6"><Logo /></header>
      <main className="max-w-md mx-auto px-4 py-6 pb-16">
        <p className="font-hand text-[22px] text-[#8A7F72]">hey {user?.displayName || "you"} ♡ —</p>
        <h1 className="font-display text-[32px] font-semibold tracking-tight leading-[1.02]">Set up your<br />couple space.</h1>

        {mode === "choice" && (
          <div className="mt-6 grid gap-3">
            <button onClick={() => setMode("create")} className="touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-5 rounded-[4px] rotate-[-0.5deg]">
              <div className="font-display font-semibold text-[18px]">Start a new Twofold</div>
              <div className="text-[14px] text-[#8A7F72]">Name it, set your date, invite your person.</div>
            </button>
            <button onClick={() => setMode("join")} className="touch text-left bg-[#E7EBDD] border border-[#A8B89A]/60 p-5 rounded-[4px] rotate-[0.5deg]">
              <div className="font-display font-semibold text-[18px]">Join theirs</div>
              <div className="text-[14px] text-[#6B7F5E]">Got an invite code? Come on in.</div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="relative mt-6 bg-[#FFFDF7] border border-[#E5DAC6] p-5">
            <Tape className="left-8 -top-[11px] rotate-[-6deg]" />
            <div className="flex flex-col gap-4">
              <Field label="Couple name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="You & Mia" /></Field>
              <Field label="Together since"><Input type="date" value={since} max={todayISO()} onChange={(e) => setSince(e.target.value)} /></Field>
              {err && <p className="text-[14px] font-semibold text-[#7D2E3B]">{err}</p>}
              <Button disabled={busy} onClick={async () => {
                if (!name.trim()) return setErr("Give your space a name first.");
                setBusy(true); setErr("");
                try {
                  await createCouple(name.trim(), since);
                  nav("/home");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Couldn't create your space. Try again?");
                } finally {
                  setBusy(false);
                }
              }}>{busy ? "Taping pages…" : "Create our space ♡"}</Button>
              <button onClick={() => setMode("choice")} className="text-[14px] underline text-[#8A7F72]">back</button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="relative mt-6 bg-[#FFFDF7] border border-[#E5DAC6] p-5">
            <Tape className="left-8 -top-[11px] rotate-[5deg]" tone="sage" />
            <div className="flex flex-col gap-4">
              <Field label="Invite code" hint="6 letters — ask your person, it's in their Profile"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MIAYOU" maxLength={6} className="uppercase tracking-[0.2em] text-center font-bold" /></Field>
              {err && <p className="text-[14px] font-semibold text-[#7D2E3B]">{err}</p>}
              <Button disabled={busy} onClick={async () => {
                setBusy(true); setErr("");
                const r = await joinCouple(code.trim());
                setBusy(false);
                if (r.error) setErr(r.error);
                else nav("/home");
              }}>{busy ? "Finding them…" : "Join our space"}</Button>
              <button onClick={() => setMode("choice")} className="text-[14px] underline text-[#8A7F72]">back</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
