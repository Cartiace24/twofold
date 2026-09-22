import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS } from "../lib/legal";

export default function Terms() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Terms of Service" intro="The little rulebook for your little place on the internet.">
      <p>
        These Terms govern your use of <strong>Twofold</strong> — “Two Lives, one story.” — a private digital scrapbook for couples operated in
        the Philippines. By creating an account or using the service you agree to these Terms. If you do not agree, do not use Twofold.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By signing up, signing in (including via a third-party login if enabled), or otherwise accessing Twofold, you enter a binding agreement
        with {P.BUSINESS_NAME}, the operator of Twofold. These Terms, together with the Privacy Policy and Community Guidelines, are the entire
        agreement for your use of the service in its current form. No one has represented Twofold as approved or certified by any regulator.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be <strong>18 years or older</strong> to use Twofold. We do not collect your date of birth to verify this; by using the service you
        represent that you meet the age requirement. Twofold is not directed to children and is not intended for anyone under 18.
      </p>

      <h2>3. Account Registration</h2>
      <p>
        You register with an email and password (and optionally a third-party login where configured). You must provide accurate information and keep
        it up to date. Your account is personal; you may not create an account for someone else without their permission. One natural person should
        use one account; a couple shares a <em>Couple</em> space, not a login.
      </p>

      <h2>4. Account Security</h2>
      <p>
        You are responsible for safeguarding your password and for activities under your account. Use a strong, unique password and keep your
        devices and email account secure. Notify us promptly via {P.CONTACT_EMAIL} if you believe your account has been compromised. We may
        temporarily lock an account to protect it, but we do not promise to detect every compromise.
      </p>

      <h2>5. Couple Accounts and Invite Codes</h2>
      <p>
        After registration you may create a <em>Couple</em> (with a name, “together since” date, and invite code) or join a partner’s Couple with
        their 6-character invite code. Membership is stored as a <code>couple_members</code> row linking your user ID to the couple ID. You may
        only join a Couple when you have the correct invite code you were given privately. Invite codes can be regenerated from Settings, which
        invalidates the previous code. Leaving or deleting a Couple is described under <Link to="/privacy">Privacy → Data Retention</Link> and in
        Settings.
      </p>

      <h2>6. User Content</h2>
      <p>
        “User Content” means everything you and your partner add: photos, memories (title, caption, date, location label, tags), notes, timeline
        entries, places, wishlist items, couple/profile information, and any text or images you upload — including via Photobooth. You are solely
        responsible for your User Content and for ensuring you have the right to share it (for example, that a photo of another person was taken
        and shared with their permission where required by law or decency).
      </p>

      <h2>7. Ownership of User Content</h2>
      <p>
        You retain ownership of your User Content. We claim no ownership. You are responsible for keeping your own copies if they matter to you,
        although you may export or delete content through the app where the feature is provided.
      </p>

      <h2>8. License Necessary to Operate Twofold</h2>
      <p>
        To provide the service, you grant {P.BUSINESS_NAME} a limited, non-exclusive, worldwide, royalty-free license to host, store, reproduce,
        display, and transmit your User Content <em>solely</em> as needed to operate Twofold for you and your partner and to perform backups and
        technical operations. This license ends when the content is deleted through the normal app flows, subject to the retention and backup
        notes in the Privacy Policy and the practical reality that deleted content may persist briefly in system backups before rotation.
      </p>

      <h2>9. Prohibited Activities</h2>
      <p>When using Twofold you must not:</p>
      <ul>
        <li>violate Philippine law, including the Data Privacy Act and other applicable statutes;</li>
        <li>upload illegal content, including child sexual abuse material (CSAM) or non-consensual intimate imagery;</li>
        <li>harass, threaten, or hate-harass another person, or impersonate anyone;</li>
        <li>attempt to access another couple’s private data, guess invite codes at scale, or bypass Row Level Security or access controls;</li>
        <li>use another person’s content without permission, or scrape, spam, or abuse the service;</li>
        <li>introduce malware, attempt to intercept or disrupt the service, or reverse-engineer the platform to extract others’ data;</li>
        <li>use Twofold to store content you have no right to store, or that infringes intellectual property.</li>
      </ul>

      <h2>10. Privacy</h2>
      <p>
        How we collect, use, share, retain, and protect information — and your rights under Philippine law — is described in our{" "}
        <Link to="/privacy">Privacy Policy</Link>, which is incorporated into these Terms. Please read it. In the Philippines the relevant framework
        is Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations, together with applicable National Privacy
        Commission issuances.
      </p>

      <h2>11. Third-Party Services</h2>
      <p>Twofold is built with a small number of processors that are actually used today:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentication (including email/password and, when enabled, Google OAuth), PostgreSQL database, and object
          storage where implemented; governed by Supabase’s own terms and privacy documentation.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting and delivery; governed by Vercel’s terms and privacy documentation.
        </li>
        <li>
          <strong>OpenStreetMap / Leaflet</strong> — map tiles and client-side map rendering for Our Places where you use that feature.
        </li>
      </ul>
      <p>
        We do not sell your personal information to these providers; they process it to provide the underlying services. Their handling of data is
        described in their own documentation, which you should review if that matters to you.
      </p>

      <h2>12. Service Availability</h2>
      <p>
        Twofold is provided on a best-effort basis. We do not promise that the service will always be available, uninterrupted, timely, or error-free.
        Maintenance, updates from our processors, and events beyond our control may cause temporary unavailability. We may modify, limit, or
        discontinue features with reasonable notice where practical.
      </p>

      <h2>13. Suspension and Termination</h2>
      <p>
        We may suspend or terminate access, remove content, or restrict features where we reasonably believe there has been a violation of these
        Terms, the Community Guidelines, or applicable law, or where necessary to protect users or the service. Where practical and not legally
        restricted, we will explain the action and how to address it. You may also stop using Twofold at any time and delete your account from
        Settings as described in the next section.
      </p>

      <h2>14. Account Deletion</h2>
      <p>
        You can delete your account from Settings. The app will explain before you confirm: “<em>Deleting your account permanently removes your
        account and associated Twofold data, subject to any information that must be retained where required or permitted by applicable law.</em>”
        We reuse the existing deletion flow — we do not maintain a second one. On deletion, your auth identity is removed and database rows linked
        to you are removed by cascade; orphaned couple spaces with no remaining members are removed as well. Storage objects are best-effort
        deleted by the client before the deletion call. System backups may retain copies briefly before rotation; we do not promise immediate
        destruction of every infrastructure copy.
      </p>

      <h2>15. Intellectual Property</h2>
      <p>
        The Twofold name, visual identity, and the application’s code and design are protected by applicable intellectual property laws. You may
        use the service as permitted by these Terms, but you may not copy, reproduce, or create derivative works of Twofold’s branding or
        proprietary elements except as allowed by law. Your User Content remains yours as described in Section 7.
      </p>

      <h2>16. Disclaimers</h2>
      <p>
        Twofold is provided “as is” and “as available” without warranties of any kind, whether express or implied, including implied warranties of
        merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by Philippine law. We do not
        warrant that the service will meet your expectations, that content will be permanently preserved, or that the service is free of errors or
        that it has been reviewed or approved by any regulator.
      </p>

      <h2>17. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by Philippine law, {P.BUSINESS_NAME} and its personnel will not be liable for indirect, incidental,
        consequential, or exemplary damages, or for loss of data, arising from your use of the service, even if advised of the possibility. Our
        aggregate liability for any claim arising from or related to the service will not exceed the amount you have paid (if any) to use Twofold
        in the twelve months preceding the claim, or PHP 1,000 if you have paid nothing — whichever is greater — unless Philippine law requires
        otherwise. Nothing in these Terms is intended to limit liability where limitation is prohibited by Philippine law.
      </p>

      <h2>18. Changes to the Service</h2>
      <p>
        We may add, change, or remove features as Twofold evolves. Where a change materially affects how you use the service we will try to give
        reasonable notice in the app or via the contact information you provided.
      </p>

      <h2>19. Changes to the Terms</h2>
      <p>
        We may update these Terms from time to time (see version at the bottom). When changes are material we will provide notice and the updated
        effective date. Continued use after the effective date constitutes acceptance of the updated Terms. If you do not agree, stop using the
        service and, if you wish, delete your account.
      </p>

      <h2>20. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to conflict-of-laws principles. Any dispute arising from or related to these Terms or the service shall, where applicable, be subject to the jurisdiction of the courts of the Philippines, without prejudice to any right you may have to lodge a complaint with the National Privacy Commission for data-privacy matters under applicable procedures.
      </p>

      <h2>21. Contact Information</h2>
      <p>
        For questions about these Terms: {P.CONTACT_EMAIL} — {P.BUSINESS_ADDRESS}. For privacy matters, see the Privacy Policy or contact{" "}
        {P.PRIVACY_EMAIL}. This document is not a substitute for review by a Philippine lawyer. The placeholders above must be replaced with the
        real operator details before you rely on these Terms for your deployment.
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version 1.0</p>
    </LegalShell>
  );
}
