import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS } from "../lib/legal";

export default function Guidelines() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Community Guidelines" intro="How we keep this little place kind, private, and safe.">
      <p>
        Twofold is a private scrapbook for two — not a public feed. The guidelines below describe what belongs here and what does not.
        Violations may lead to content removal, account restrictions, or termination where permitted by the Terms, and may be reported to the
        appropriate authorities where required by Philippine law. Contact: {P.CONTACT_EMAIL} · {P.PRIVACY_EMAIL}.
      </p>

      <h2>You must be 18 or older</h2>
      <p>Twofold is intended for adults. You must be 18 or older to register or use the service. Do not create an account if you are under 18.</p>

      <h2>Be lawful</h2>
      <p>Do not use Twofold to break Philippine law. This includes, without limitation, not uploading or sharing content that is illegal to possess or distribute in the Philippines.</p>

      <h2>Be consensual</h2>
      <ul>
        <li>Do not share non-consensual intimate imagery.</li>
        <li>Do not share a photo of another person in a private context without their permission.</li>
        <li>Do not use a partner’s Twofold content outside the couple without their permission.</li>
      </ul>
      <p>This is a shared diary for a couple — respect that boundary.</p>

      <h2>No harassment, threats, or hate</h2>
      <p>Do not harass, threaten, dox, or hate-harass another person — whether inside a couple space or elsewhere in the service (for example, by guessing invite codes to contact someone who has not invited you).</p>

      <h2>Absolutely no child sexual abuse material</h2>
      <p>Child sexual abuse material is prohibited and will be removed and reported as required by Philippine law. Do not sexualize, groom, or exploit minors. Twofold must never be used to store or share sexual material involving anyone under 18.</p>

      <h2>No impersonation or unauthorized access</h2>
      <ul>
        <li>Do not impersonate another person or create an account for someone else without their permission.</li>
        <li>Do not attempt to access another couple’s private data, guess invite codes at scale, or bypass Row Level Security or access controls.</li>
        <li>Do not use leaked or shared credentials to access someone else’s account.</li>
      </ul>

      <h2>No malicious activity</h2>
      <p>Do not introduce malware, attempt to intercept or disrupt the service, scrape or spam the service, or reverse-engineer the platform to extract others’ data. Do not abuse rate limits or invite codes.</p>

      <h2>Keep it private</h2>
      <p>
        Your photos and notes are private to your couple — that is the point. Do not publish another couple’s private content without permission, and
        do not treat invite codes as public links. If you share your invite code in a group chat, anyone with the code could attempt to join.
      </p>

      <h2>What happens when guidelines are broken</h2>
      <p>Depending on the nature and severity, we may:</p>
      <ul>
        <li>remove the content;</li>
        <li>restrict features or suspend an account;</li>
        <li>terminate an account where permitted by the Terms;</li>
        <li>report content as required by Philippine law.</li>
      </ul>
      <p>Where practical and not legally restricted, we will explain the action. If you believe an action was taken in error, contact {P.CONTACT_EMAIL}.</p>

      <h2>How to report</h2>
      <p>
        If you see content or behavior that violates these guidelines, contact {P.CONTACT_EMAIL} with the details you can safely share. If the matter
        involves an immediate risk to safety, contact the appropriate authorities in the Philippines.
      </p>

      <h2>A note on moderation</h2>
      <p>
        Twofold is small and private by design; there is no public feed to moderate. Most review happens only when a report is received or when
        required by law or the platform’s security obligations under the DPA (see the Privacy Policy for the security description). We do not claim
        to catch every violation automatically.
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version 1.0 · Last updated with the Terms and Privacy Policy. See the full <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
    </LegalShell>
  );
}
