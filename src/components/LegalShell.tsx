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
      <header className="max-w-[760px] mx-auto px-4 sm:px-6 pt-5 flex items-center justify-between">
        <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]">
          <Logo />
        </Link>
        <Link to="/" className="touch inline-flex items-center gap-1.5 text-[14px] font-bold text-[#8A7F72] hover:text-[#4A423B]">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 pb-16">
        <div className="relative mt-8 bg-[#FFFDF7] border border-[#E5DAC6] p-6 sm:p-8">
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

          <article className="mt-10 prose prose-neutral max-w-none text-left prose-p:my-4 prose-p:leading-[1.75] prose-p:text-[15.5px] prose-p:text-[#4A423B] prose-a:text-[#7D2E3B] prose-a:font-semibold prose-a:underline prose-a:underline-offset-2 prose-a:decoration-[#7D2E3B]/30 hover:prose-a:decoration-[#7D2E3B] prose-headings:font-display prose-headings:tracking-tight prose-headings:font-semibold prose-headings:text-[#2B2622] prose-h2:text-[24px] prose-h2:leading-tight prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-[#E5DAC6]/60 prose-h3:text-[17px] prose-h3:leading-snug prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-[#4A423B] prose-ul:my-6 prose-ul:pl-6 prose-ul:list-disc prose-ul:space-y-2.5 prose-ul:marker:text-[#B6AA99] prose-li:text-[14.5px] prose-li:leading-relaxed prose-li:text-[#4A423B] prose-strong:text-[#2B2622] prose-strong:font-semibold">
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
