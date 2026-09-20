import { Link } from "react-router-dom";
import { ArrowRight, BookHeart, Camera, MapPin, PenLine } from "lucide-react";
import { Doodle, Logo, Polaroid, Tape } from "../components/scrapbook/bits";

export default function Landing() {
  return (
    <div className="paper-grain min-h-dvh">
      {/* top bar — logo only; CTAs live in the hero so the top doesn't repeat them */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 flex items-center">
        <Logo />
      </header>

      {/* hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center pt-10 sm:pt-16 pb-10">
          <div className="relative">
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C] mb-3">a private diary for two</p>
            <h1 className="font-display font-semibold tracking-tight leading-[0.95] text-[52px] sm:text-[76px]">
              twofold
            </h1>
            <p className="font-display italic text-[24px] sm:text-[30px] mt-1 text-[#4A423B]">Two Lives, one story.</p>
            <p className="mt-4 text-[17px] sm:text-[18px] leading-relaxed text-[#4A423B] max-w-[42ch]">
              A private little place for the moments, memories, and things that belong to the two of you.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="touch inline-flex items-center justify-center gap-2 bg-[#7D2E3B] text-[#FFFDF7] px-7 rounded-[3px] text-[16px] font-bold">
                Create your Twofold <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="touch inline-flex items-center justify-center bg-[#FFFDF7] border border-[#E5DAC6] px-7 rounded-[3px] text-[16px] font-bold">
                Log in
              </Link>
            </div>
            <p className="mt-4 font-hand text-[20px] text-[#8A7F72]">no followers, no feed — just the two of you ♡</p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold text-[#4A423B]">
              <span className="inline-flex items-center gap-1.5"><Camera size={17} className="text-[#7D2E3B]" /> photos & film</span>
              <span className="inline-flex items-center gap-1.5"><PenLine size={17} className="text-[#7D2E3B]" /> notes & letters</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={17} className="text-[#7D2E3B]" /> places map</span>
              <span className="inline-flex items-center gap-1.5"><BookHeart size={17} className="text-[#7D2E3B]" /> our story</span>
            </div>
          </div>

          {/* scrapbook composition */}
          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none h-[480px] sm:h-[540px]" aria-hidden>
            <div className="absolute left-0 top-2 w-[56%] rotate-[-4deg]">
              <Polaroid src="https://picsum.photos/seed/twofold-hero1/600/680" caption="us, lake day" date="jul ’26" />
            </div>
            <div className="absolute right-0 top-16 w-[52%] rotate-[3.5deg]">
              <Polaroid src="https://picsum.photos/seed/twofold-hero2/600/640" caption="coney island!!" date="may ’26" />
            </div>
            <div className="absolute left-[8%] bottom-0 w-[62%] rotate-[-1.5deg] bg-[#FFFDF7] border border-[#E5DAC6] p-4 shadow-md">
              <Tape className="left-6 -top-[10px] rotate-[-8deg]" tone="sage" />
              <p className="font-hand text-[22px] leading-[1.15] text-[#4A423B]">sunday: record player, candles, side B all the way through —</p>
              <p className="font-hand text-[22px] text-[#7D2E3B]">perfect, actually.</p>
              <Doodle kind="heart" className="absolute -right-2 -bottom-2 text-[#7D2E3B] rotate-12" />
            </div>
            <Doodle kind="flower" className="absolute right-[8%] bottom-[26%] text-[#8B5E3C]" />
            <Doodle kind="star" className="absolute left-[4%] top-[46%] text-[#E8A838]" />
            <Doodle kind="arrow" className="absolute left-[46%] top-[2%] text-[#6B7F5E] rotate-[-12deg]" />
            <div className="absolute right-[4%] top-[2%] stamp text-[#7D2E3B] bg-[#FFFDF7]/80">no. 001 — ours</div>
          </div>
        </div>

        {/* strips */}
        <section className="pb-14">
          <div className="film rounded-[4px] overflow-hidden">
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <img key={i} src={`https://picsum.photos/seed/twofold-film${i}/300/220`} alt="" loading="lazy" className="h-[110px] sm:h-[130px] w-auto shrink-0 border border-white/20" />
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { t: "Save it in seconds", d: "Open Twofold, tap Add, pick a photo, one line. Done — it's in your story.", e: "♡" },
              { t: "Private by design", d: "One couple space, invite-only. Your pages are never public, never feed.", e: "✳" },
              { t: "Made to revisit", d: "Film walls, timelines, maps, bucket lists — built for anniversaries.", e: "❀" },
            ].map((c) => (
              <div key={c.t} className="paper-card p-5 odd:rotate-[-0.5deg] even:rotate-[0.5deg]">
                <div className="font-hand text-[26px] text-[#7D2E3B]">{c.e}</div>
                <h3 className="font-display font-semibold text-[18px] mt-1">{c.t}</h3>
                <p className="text-[14.5px] text-[#4A423B] mt-1 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center border-t border-[#E5DAC6] pt-8 pb-4">
            <p className="font-display text-[26px] font-semibold">We made our own little place on the internet.</p>
            <p className="font-hand text-[21px] text-[#8A7F72] mt-1">yours is one tap away —</p>
            <Link to="/signup" className="touch inline-flex items-center gap-2 mt-4 bg-[#2B2622] text-[#FAF6EF] px-8 rounded-[3px] font-bold">Create your Twofold <ArrowRight size={18} /></Link>
            <p className="mt-6 text-[12px] uppercase tracking-[0.2em] text-[#B6AA99]">twofold · Two Lives, one story.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
