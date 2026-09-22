import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS } from "../lib/legal";

export default function Guidelines() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Community Guidelines" intro="Keep this little place kind and private.">
      <p>
        Twofold is a private diary for two, not a public feed. These guidelines apply to anything you add. Violations may lead to removal,
        restriction, or termination where the Terms allow, and may be reported where Philippine law requires. Contact: {P.CONTACT_EMAIL}.
      </p>

      <h2>You must be 18+</h2>
      <p>Do not use Twofold if you are under 18.</p>

      <h2>Respect</h2>
      <ul>
        <li>Don’t harass, threaten, or hate-harass others — including by guessing invite codes to contact someone uninvited.</li>
        <li>Don’t impersonate another person or use their account without permission.</li>
      </ul>

      <h2>Consent & safety</h2>
      <ul>
        <li>Don’t share non-consensual intimate imagery or private imagery without permission.</li>
        <li>Never store or share sexual material involving anyone under 18 — it will be removed and reported as required by Philippine law.</li>
      </ul>

      <h2>Stay lawful & secure</h2>
      <ul>
        <li>Don’t upload illegal content or use Twofold for unlawful activity.</li>
        <li>Don’t attempt unauthorized access, bypass Row Level Security, or access another couple’s private data.</li>
        <li>Don’t introduce malware, scrape, spam, or abuse rate limits or invite codes.</li>
        <li>Don’t misuse another person’s private information outside the couple.</li>
      </ul>

      <h2>If something’s wrong</h2>
      <p>Report it to {P.CONTACT_EMAIL} with what you can safely share. For immediate risk, contact the appropriate authorities in the Philippines.</p>

      <p className="text-[12px] text-[#B6AA99]">Version 1.0 · See also <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
    </LegalShell>
  );
}
