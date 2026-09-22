import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LEGAL_LAST_UPDATED } from "../lib/legal";
import { Logo, Tape } from "../components/scrapbook/bits";

function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="paper-grain min-h-dvh">
      <header className="max-w-[760px] mx-auto px-5 sm:px-6 pt-5 flex items-center justify-between">
        <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]">
          <Logo />
        </Link>
        <Link to="/" className="touch inline-flex items-center gap-1.5 text-[14px] font-bold text-[#8A7F72] hover:text-[#4A423B]">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>

      <main className="max-w-[760px] mx-auto px-5 sm:px-6 pb-16">
        <div className="relative mt-8 bg-[#FFFDF7] border border-[#E5DAC6] p-5 sm:p-8">
          <Tape className="left-1/2 -translate-x-1/2 -top-[11px]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C]">twofold · {title.toLowerCase()}</p>
          <h1 className="font-display text-[32px] sm:text-[38px] font-semibold tracking-tight leading-[1.02] mt-1">{title}</h1>
          <p className="font-hand text-[20px] text-[#8A7F72] leading-tight mt-1">{intro}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B6AA99] mt-2">Last updated · {LEGAL_LAST_UPDATED}</p>

          <div className="mt-6 h-px bg-[#E5DAC6]" aria-hidden />

          <nav className="mt-5 flex flex-wrap gap-2 text-[13px] font-bold" aria-label="Legal pages">
            <Link to="/terms" className="underline underline-offset-2 text-[#7D2E3B] hover:text-[#2B2622]">Terms</Link>
            <span className="text-[#B6AA99]">·</span>
            <Link to="/privacy" className="underline underline-offset-2 text-[#7D2E3B] hover:text-[#2B2622]">Privacy</Link>
            <span className="text-[#B6AA99]">·</span>
            <Link to="/guidelines" className="underline underline-offset-2 text-[#7D2E3B] hover:text-[#2B2622]">Guidelines</Link>
          </nav>

          <article className="legal-content mt-10">
            {children}
          </article>

          <div className="mt-10 p-4 bg-[#FAF6EF] border border-dashed border-[#E5DAC6] text-[12.5px] text-[#8A7F72] leading-relaxed">
            Twofold is a small, private scrapbook — this page is a plain-language explanation of how it works. It is not legal advice, not a certification, and not an approval by the National Privacy Commission. If you are the operator, have these pages reviewed by a Philippine lawyer or privacy professional before relying on them.
          </div>
        </div>
      </main>
    </div>
  );
}

export default LegalShell;
