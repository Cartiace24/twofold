import { useState } from "react";
import { Copy, Share2, RefreshCw } from "lucide-react";
import { Tape } from "./scrapbook/bits";

export function InviteCodeCard({ code, onRegenerate, compact = false }: { code: string; onRegenerate?: () => void; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const text = `Join me on twofold — Two Lives, one story. Use invite code ${code}`;
    const shareData: ShareData = { title: "Join my Twofold", text };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
        return;
      }
    } catch {
      /* user cancelled */
      return;
    }
    copy();
  };

  return (
    <div className={`relative bg-[#E7EBDD] border border-[#A8B89A]/60 p-4 ${compact ? "" : "rotate-[0.3deg]"}`}>
      <Tape className="left-1/2 -translate-x-1/2 -top-[10px] w-[64px] rotate-[-2deg]" tone="sage" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-[17px] leading-none">Invite your person</h3>
          <p className="text-[13px] text-[#4A423B] leading-tight mt-1">They sign up → Join theirs → enter this code</p>
        </div>
        {onRegenerate && (
          <button onClick={onRegenerate} aria-label="Generate new invite code" className="touch w-9 h-9 grid place-items-center bg-white border border-[#A8B89A]/50 rounded-[3px] text-[#6B7F5E] shrink-0">
            <RefreshCw size={15} />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        <code
          aria-label={`Invite code ${code.split("").join(" ")}`}
          className="flex-1 grid place-items-center text-center font-mono font-bold tracking-[0.32em] text-[22px] bg-[#FFFDF7] border-2 border-[#7D2E3B]/15 rounded-[3px] py-2.5 select-all"
        >
          {code}
        </code>
        <button
          onClick={copy}
          aria-live="polite"
          className="touch min-w-[72px] px-3 bg-[#2B2622] text-[#FAF6EF] rounded-[3px] font-bold text-[13px] inline-flex flex-col items-center justify-center leading-none gap-1"
        >
          <Copy size={16} aria-hidden />
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={share}
          aria-live="polite"
          className="touch min-w-[64px] px-3 bg-[#FFFDF7] border-2 border-[#7D2E3B]/15 rounded-[3px] font-bold text-[13px] inline-flex flex-col items-center justify-center leading-none gap-1 text-[#7D2E3B]"
        >
          <Share2 size={16} aria-hidden />
          {shared ? "Shared!" : "Share"}
        </button>
      </div>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A7F72] text-center">tap copy or share — works in any chat ♡</p>
    </div>
  );
}
