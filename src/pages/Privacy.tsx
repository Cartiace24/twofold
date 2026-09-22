import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS, PRIVACY_VERSION } from "../lib/legal";

export default function Privacy() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Privacy Policy" intro="What we actually collect, why, and your rights under Philippine law — in plain language.">
      <p>
        This notice explains how <strong>{P.BUSINESS_NAME}, the operator of Twofold</strong> handles personal information in the Philippines,
        with <strong>Republic Act No. 10173 — Data Privacy Act of 2012 (DPA)</strong>, its IRR, and NPC guidance in mind — especially
        transparency, legitimate purpose, and proportionality. It’s the privacy notice for Twofold, not legal advice and not an NPC approval.
      </p>

      <h2>Who is the controller?</h2>
      <p>
        The Personal Information Controller is <strong>{P.BUSINESS_NAME}, the operator of Twofold</strong> (placeholder until the real operator is
        supplied). Reach us at:
      </p>
      <ul>
        <li>Privacy / data-subject requests: {P.PRIVACY_EMAIL}</li>
        <li>Legal: {P.LEGAL_EMAIL} · General: {P.CONTACT_EMAIL} · Address: {P.BUSINESS_ADDRESS}</li>
      </ul>
      <p>No Data Protection Officer is listed — we don’t invent one. If a DPO is appointed or required, we’ll list them here.</p>

      <h2>What we collect — only what the app actually uses</h2>
      <p>Inspected from <code>supabase/schema.sql</code> and the live code. No ads, behavioral tracking, or fingerprinting was found.</p>
      <ul>
        <li>
          <strong>Account</strong> — email, user ID, display name/avatar you set, password verifier (held by Supabase Auth), provider ID if you use
          Google OAuth, timestamps.
        </li>
        <li>
          <strong>Couple</strong> — couple ID, membership (user ID + role owner/member), invite code and whether you created/joined, couple
          profile (name, together-since, description, accent, cover/avatar URLs).
        </li>
        <li>
          <strong>Diary you add</strong> — photos (compressed JPEG in <code>memory_photos.url</code> today; private bucket{" "}
          <code>couple-photos</code> is provisioned but not yet the write path), memories (title/caption/date/location/tags/creator), notes
          (body/style/author), timeline (title/date/description/photo/location), places (name/desc/lat-lng/photo/linked memory), wishlist
          (title/category/note/done), and <code>created_by</code> where stored.
        </li>
        <li>
          <strong>Technical</strong> — only what browsers/hosts necessarily see (IP, request time, error logs via Vercel/Supabase). No
          advertising IDs, no behavioral analytics, no location tracking beyond the place you intentionally enter, no profiling.
        </li>
      </ul>

      <h2>Private by default</h2>
      <p>
        A Couple space is visible only to its two members. Every couple-scoped table is gated by <strong>Row Level Security</strong>{" "}
        (<code>is_couple_member</code>). Non-members can’t read another couple’s rows. Photos today live as compressed JPEG text in
        RLS-protected rows (long edge 1600, JPEG ~0.82), not as public URLs — the private <code>couple-photos</code> bucket exists but isn’t
        the active write path. No public bucket is used. We don’t claim end-to-end encryption or that no operator could ever access data.
      </p>

      <h2>Photobooth</h2>
      <p>
        The camera runs only when you open Photobooth and only after your browser’s permission prompt. You can pick front/rear, and the stream is
        stopped when you leave. Only the photo you tap “Use Photo” on is processed (canvas) and saved through the same private, compressed flow.
        We don’t continuously record you.
      </p>

      <h2>How we lawfully process (DPA)</h2>
      <p>Not everything is “consent.” Examples under the DPA:</p>
      <ul>
        <li>
          <strong>Contract / steps prior to contract</strong> — creating your account and Couple space you asked for.
        </li>
        <li>
          <strong>Contract + consent where you actively share</strong> — the diary content you voluntarily add for the two of you.
        </li>
        <li>
          <strong>Consent</strong> — a Photobooth photo you actively choose to keep.
        </li>
        <li>
          <strong>Legal obligation / legitimate interest</strong> — password-reset and security, and retention for legal claims where applicable.
        </li>
      </ul>
      <p>We don’t use blanket consent as a substitute for the real basis.</p>

      <h2>Who receives it</h2>
      <ul>
        <li>Your partner — within the same Couple, you share what you both add.</li>
        <li>
          <strong>Processors actually used:</strong> Supabase (auth, Postgres, provisioned storage), Vercel (hosting), OpenStreetMap/Leaflet for map
          tiles where you use Our Places, and Google OAuth only if you use it and it’s enabled.
        </li>
        <li>We don’t sell personal data. Each processor’s own privacy documentation governs its handling.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Personal information is kept only as long as necessary for the diary, subject to legal claims or other lawful requirements (DPA Sec. 11).
      </p>
      <ul>
        <li>While your account/Couple exists, your diary stays until you remove it.</li>
        <li>Deleting a memory/note/place/wishlist entry removes that row (photos cascade) with best-effort Storage removal.</li>
        <li>Leaving a Couple removes your membership; if you were last, the orphaned Couple and its diary are removed.</li>
        <li>
          Deleting your account (Settings) shows: “<em>Deleting your account permanently removes your account and associated Twofold data,
          subject to any information that must be retained where required or permitted by applicable law.</em>” The RPC then removes memberships,
          orphaned couples, profile, and <code>auth.users</code>; backups may linger briefly before rotation.
        </li>
      </ul>
      <p>
        Placeholders until counsel defines them: standard operational retention — [STANDARD OPERATIONAL RETENTION]; backup rotation —
        [BACKUP ROTATION].
      </p>

      <h2>Your rights (RA 10173)</h2>
      <p>Subject to the Act’s qualifications and exceptions:</p>
      <ul>
        <li>be informed (this notice);</li>
        <li>access your data (in the app or via {P.PRIVACY_EMAIL});</li>
        <li>correct it (edit in the app);</li>
        <li>object (where consent/legitimate interest applies);</li>
        <li>erasure/blocking where applicable;</li>
        <li>data portability where applicable and technically feasible;</li>
        <li>damages; and to file a complaint with the National Privacy Commission.</li>
      </ul>
      <p>
        Contact {P.PRIVACY_EMAIL} to exercise them — we may need to verify you first.
      </p>

      <h2>Security & breaches</h2>
      <p>
        Reasonable, risk-appropriate measures as the DPA requires: Supabase Auth, RLS on every couple table, private Storage bucket provisioned,
        session handling, and HTTPS via Vercel. No system is perfectly secure. We handle any personal data breach per the DPA/IRR and applicable
        NPC Circular, including NPC and, where required, affected-subject notification — without inventing a deadline beyond what the law requires.
      </p>

      <h2>Changes & contact</h2>
      <p>
        We may update this policy (current version {PRIVACY_VERSION}). For material changes we’ll give notice in the app. Questions or
        requests: {P.PRIVACY_EMAIL} · {P.LEGAL_EMAIL} · {P.CONTACT_EMAIL} · {P.BUSINESS_ADDRESS}. You may also lodge a complaint with the NPC
        under its procedures (<a href="https://privacy.gov.ph/data-subject-rights/" target="_blank" rel="noreferrer">privacy.gov.ph</a>).
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version {PRIVACY_VERSION} · Not legal advice. Have a Philippine privacy professional review before relying on this.</p>
    </LegalShell>
  );
}
