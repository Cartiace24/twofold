import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS } from "../lib/legal";

export default function Terms() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Terms of Service" intro="The short, honest rules for your private scrapbook.">
      <p>
        These Terms govern your use of <strong>Twofold</strong> — “Two Lives, one story.” By creating an account or using the service you agree to
        them. If you don’t agree, don’t use Twofold. They work together with our <Link to="/privacy">Privacy Policy</Link> and{" "}
        <Link to="/guidelines">Community Guidelines</Link>.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        When you sign up, sign in, or otherwise use Twofold you enter a binding agreement with {P.BUSINESS_NAME}, the operator of Twofold. This
        placeholder will be replaced with the real legal/business name and address ({P.BUSINESS_ADDRESS}) before you rely on it — we don’t invent a
        company here.
      </p>

      <h2>2. Eligibility — 18+</h2>
      <p>
        You must be <strong>18 or older</strong> to use Twofold. By using it you represent that you meet this requirement. We don’t collect your
        date of birth to check — we rely on your representation.
      </p>

      <h2>3. Account Responsibility</h2>
      <p>
        Keep your email, password, and devices secure. You’re responsible for activity under your account. Tell us at {P.CONTACT_EMAIL} if you
        think it’s been compromised. Use a strong, unique password.
      </p>

      <h2>4. Private Couple Content</h2>
      <p>
        Twofold is a private diary for two. After signup you may create a Couple (name, “together since” date, invite code) or join your partner’s
        Couple with their 6-character code. Content you add — photos, memories, notes, timeline entries, places, wishlist items, profile details —
        is visible only to the two members of that Couple (enforced by Row Level Security). You may only add content you have the right to share.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>Use Twofold respectfully and lawfully. Do not:</p>
      <ul>
        <li>violate Philippine law;</li>
        <li>attempt to access another couple’s private data, guess invite codes at scale, or bypass access controls;</li>
        <li>introduce malware or disrupt the service, scrape or spam.</li>
      </ul>

      <h2>6. Prohibited Content</h2>
      <ul>
        <li>illegal content, including child sexual abuse material (CSAM);</li>
        <li>non-consensual intimate imagery or private imagery shared without permission;</li>
        <li>harassment, threats, hate-based harassment, impersonation.</li>
      </ul>
      <p>See the <Link to="/guidelines">Guidelines</Link> for the full list. Violations may lead to removal or restrictions where permitted.</p>

      <h2>7. Your Content — You Own It</h2>
      <p>
        You retain ownership of what you add. To operate Twofold we need a limited, non-exclusive, royalty-free license to host, store, and display
        it for you and your partner only. That license ends when you delete the content via the normal app flows, subject to brief backup rotation.
      </p>

      <h2>8. Suspension & Termination</h2>
      <p>
        We may suspend or restrict access if we reasonably believe these Terms or the Guidelines were violated or the service or others are at
        risk. Where practical and not legally restricted we’ll explain why. You may stop using Twofold at any time and delete your account from
        Settings — as described in the Privacy Policy.
      </p>

      <h2>9. Service Availability & Limits</h2>
      <p>
        Twofold is provided “as is” and “as available” without warranties, to the extent Philippine law allows. We don’t promise it will always be
        uninterrupted or error-free, or that content is permanently preserved. Features may change with reasonable notice where practical.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms (current version at the bottom). For material changes we’ll give notice in the app or via your contact. Continued
        use after the effective date is acceptance. If you disagree, stop using the service.
      </p>

      <h2>11. Philippine Law</h2>
      <p>
        These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-laws rules. Data-privacy matters are
        subject to Republic Act No. 10173 (Data Privacy Act of 2012), its IRR, and National Privacy Commission procedures — including your right
        to complain to the NPC where applicable.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions: {P.CONTACT_EMAIL} · Legal: {P.LEGAL_EMAIL} · Privacy: {P.PRIVACY_EMAIL} · Address: {P.BUSINESS_ADDRESS}. This page is not legal
        advice and not an NPC approval. Have a Philippine lawyer review before relying on it.
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version 1.0</p>
    </LegalShell>
  );
}
