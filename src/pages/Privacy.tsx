import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";
import { LEGAL_PLACEHOLDERS, PRIVACY_VERSION } from "../lib/legal";

/**
 * Philippine Privacy Policy — RA 10173 (Data Privacy Act of 2012) + IRR
 *
 * This is a plain-language notice that satisfies the NPC guidance that
 * data subjects be informed of: what is collected, why, how, who receives
 * it, who the controller is, how long it is kept, and their rights.
 *
 * Data categories here are limited to what Twofold actually collects
 * (see “What we collect” and the Supabase schema). No advertising,
 * behavioral tracking, location tracking, cookies-for-ads, or
 * device fingerprinting is invented.
 */
export default function Privacy() {
  const P = LEGAL_PLACEHOLDERS;
  return (
    <LegalShell title="Privacy Policy" intro="How Twofold handles your personal information under Philippine law — in plain language.">
      <p>
        This Privacy Policy explains how <strong>{P.BUSINESS_NAME}, the operator of Twofold</strong> (“we,” “us”), handles personal
        information when you use Twofold. It is written with the requirements of <strong>Republic Act No. 10173 — Data Privacy Act of 2012 (DPA)</strong>,
        its Implementing Rules and Regulations (IRR), and applicable National Privacy Commission (NPC) guidance in mind — particularly the
        principles of <em>transparency, legitimate purpose, and proportionality</em> (Sec. 11, DPA). It is intended to function as your
        <strong> privacy notice</strong>: the place you can learn what we collect, why, how, who receives it, how long it is kept, who controls it,
        and your rights. This is not legal advice and is not an approval by the NPC.
      </p>

      <div className="bg-[#FAF6EF] border border-[#E5DAC6] p-4 text-[13px] leading-relaxed">
        <strong>Reading tip:</strong> Twofold’s legal bases are <em>not</em> “all consent.” Some information is processed because you asked us to
        (consent), but much is processed because it is necessary to provide the private scrapbook you signed up for (contract / steps prior to
        contract), or because Philippine law requires it. The table in “How we lawfully process” makes the distinction explicit.
      </div>

      <h2>Who we are — the Personal Information Controller (PIC)</h2>
      <p>
        The <strong>Personal Information Controller (PIC)</strong> for Twofold is <strong>{P.BUSINESS_NAME}, the operator of Twofold</strong>. Until
        a real business name is supplied, this placeholder remains — we do not invent a company. Contact:
      </p>
      <ul>
        <li>
          Controller / operator: {P.BUSINESS_NAME} — {P.BUSINESS_ADDRESS}
        </li>
        <li>Privacy inquiries / data-subject requests: {P.PRIVACY_EMAIL}</li>
        <li>Legal inquiries: {P.LEGAL_EMAIL}</li>
        <li>General: {P.CONTACT_EMAIL}</li>
      </ul>
      <p>
        No Data Protection Officer (DPO) is listed here, and we do not falsely claim that one exists. If a DPO or Data Protection Officer /
        Compliance Officer is appointed or required under NPC rules, their details will be added here and to the NPC registration where applicable.
        Until then the appropriate privacy contact is {P.PRIVACY_EMAIL}. The NPC notes that certain PICs/PIPs are required to register and to
        designate a DPO — whether Twofold must do so depends on the real operator’s circumstances; have a Philippine privacy professional advise
        you.
      </p>

      <h2>What we collect — only what Twofold actually uses</h2>
      <p>Before writing this section we inspected the live Supabase schema and front-end code. No analytics, ad IDs, behavioral tracking, or fingerprinting was found.</p>

      <h3>Account data</h3>
      <ul>
        <li>email address (from Supabase Auth);</li>
        <li>user ID (<code>auth.users.id</code> / <code>profiles.id</code>);</li>
        <li>display name and optional avatar you supply;</li>
        <li>authentication information (password verifier held by Supabase Auth, third-party identifier if Google OAuth is enabled and you use it, session tokens);</li>
        <li>account timestamps (<code>created_at</code>).</li>
      </ul>

      <h3>Couple data</h3>
      <ul>
        <li>
          couple ID, membership rows (<code>couple_members</code> — your user ID, couple ID, role <code>owner</code>/<code>member</code>);
        </li>
        <li>invite code and whether you created or joined via that code;</li>
        <li>couple profile you and your partner supply: name, “together since” date, short description, accent, cover / avatar URLs.</li>
      </ul>

      <h3>User Content — the diary itself</h3>
      <ul>
        <li>
          <strong>Photos</strong> — the images you upload (for example, on a memory) and, in the present production build, the compressed JPEG
          bytes stored as text in <code>memory_photos.url</code> (Supabase Storage bucket <code>couple-photos</code> is provisioned but not yet the
          write path; see “Photos and private couple content”). Where you use Photobooth we store only the final image you choose to keep, not a
          continuous camera stream;
        </li>
        <li>memories — title, caption, date, location label, lat/lng, tags, creator, favorite;</li>
        <li>notes — body, paper style, author, favorite, date label;</li>
        <li>timeline entries — title, date, description, optional photo, location label;</li>
        <li>places — name, description, lat/lng, date, optional photo, linked memory;</li>
        <li>wishlist items — title, category, note, done;</li>
        <li>
          profile information already listed above. Where a row includes <code>created_by</code>, we store the user ID that created it — this is
          how sharing within a couple and later account-deletion scoping work.
        </li>
      </ul>

      <h3>Technical data — only what actually exists</h3>
      <ul>
        <li>
          Information your browser necessarily sends when you load the app: IP address, request times, and error logs held by the hosting and
          infrastructure providers (see “Processors”). Twofold’s own application code does not add advertising or behavioral trackers;
        </li>
        <li>
          No advertising identifiers, no behavioral analytics, no location tracking beyond the place lat/lng you intentionally enter, no profiling,
          and no advertising cookies are invented in this policy because none were found in the implementation.
        </li>
      </ul>

      <h2>Photos and private couple content — the point of Twofold</h2>
      <p>Twofold is designed around <strong>private couple content</strong>: a Couple space is visible only to its two members. That privacy is enforced in two places:</p>
      <ul>
        <li>
          <strong>Row Level Security (RLS)</strong> on PostgreSQL: every couple-scoped table is readable/writable only when <code>is_couple_member</code> (or the creator before the first member is added). Non-members cannot read another couple’s rows.
        </li>
        <li>
          <strong>Storage:</strong> in the current production build, photo bytes are <strong>not</strong> yet written to Supabase Storage; they are compressed in the browser (<code>compressImage</code>, long edge 1600px, JPEG ~0.82) and then stored as text in the couple’s own database rows. The private <code>couple-photos</code> bucket and its RLS example policies exist in the schema but are not the active write path — documentation here reflects that reality. Photos are private because they live in RLS-protected rows, not because of any public bucket or public URL (we do not create permanent public URLs for private photos).
        </li>
      </ul>
      <p>
        We do not claim that photos are end-to-end encrypted. Supabase hosting, database, and (where later used) Storage hold the ciphertext-at-rest that the platform provides; access by the operator and by the hosting provider is as described in their documentation. We do not claim that Twofold employees cannot access data — access should be governed by your organizational measures and by the processors below.
      </p>

      <h2>Photobooth / camera</h2>
      <p>Photobooth is a client-side camera view that uses the browser’s own device camera APIs:</p>
      <ul>
        <li>the camera is requested only when you open Photobooth and only after the browser’s permission prompt;</li>
        <li>you can choose front / rear camera where your device supports both;</li>
        <li>the browser provides the video stream via <code>navigator.mediaDevices.getUserMedia</code>; we do not keep the camera running after you leave Photobooth (all tracks are stopped and <code>srcObject</code> cleared);</li>
        <li>you control permission in the browser / device settings, including revoking it;</li>
        <li>only the photo you tap “Use Photo” on is processed — via canvas — and, if you choose “Save,” handled through the same compressed, RLS-protected flow as other photos. We do not continuously record you, and we do not store a camera stream unless you actively save a capture.</li>
      </ul>

      <h2>How we lawfully process</h2>
      <p>
        The DPA recognizes several lawful bases. Twofold does not treat all processing as “consent.” The position below is illustrative — treat it as the operator’s statement and have it reviewed — but it separates consent from what is necessary to deliver the diary:
      </p>

      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-left text-[13px] border border-[#E5DAC6] border-collapse">
          <thead>
            <tr className="bg-[#FAF6EF]">
              <th className="border border-[#E5DAC6] px-3 py-2">Processing</th>
              <th className="border border-[#E5DAC6] px-3 py-2">Personal information involved</th>
              <th className="border border-[#E5DAC6] px-3 py-2">Lawful basis asserted (PH DPA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#E5DAC6] px-3 py-2">Creating and operating your account and couple space</td>
              <td className="border border-[#E5DAC6] px-3 py-2">email, user ID, password verifier, couple membership, invite code handling</td>
              <td className="border border-[#E5DAC6] px-3 py-2">Contract (performance of the service you requested) / steps prior to contract; Legitimate purpose</td>
            </tr>
            <tr>
              <td className="border border-[#E5DAC6] px-3 py-2">Storing your diary (photos, memories, notes, timeline, places, wishlist)</td>
              <td className="border border-[#E5DAC6] px-3 py-2">the content you voluntarily add</td>
              <td className="border border-[#E5DAC6] px-3 py-2">Contract (the service is the storage and display of that diary for the two of you); Consent where you actively choose to share content within the couple</td>
            </tr>
            <tr>
              <td className="border border-[#E5DAC6] px-3 py-2">Photobooth captures you choose to keep</td>
              <td className="border border-[#E5DAC6] px-3 py-2">the image bytes you chose to save and its storage</td>
              <td className="border border-[#E5DAC6] px-3 py-2">Consent (you tapped “Use Photo” / “Save”) together with contract (delivery of the feature)</td>
            </tr>
            <tr>
              <td className="border border-[#E5DAC6] px-3 py-2">Password-reset, email confirmation, security and abuse prevention</td>
              <td className="border border-[#E5DAC6] px-3 py-2">email, auth records, request metadata necessarily processed by the auth platform</td>
              <td className="border border-[#E5DAC6] px-3 py-2">Legal obligation / Legitimate interest (security); Contract</td>
            </tr>
            <tr>
              <td className="border border-[#E5DAC6] px-3 py-2">Retention for legal claims, regulatory requirements, or legitimate business purposes</td>
              <td className="border border-[#E5DAC6] px-3 py-2">as described in “Data retention”</td>
              <td className="border border-[#E5DAC6] px-3 py-2">Legal obligation / Legitimate interest, in each case subject to DPA qualifications</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Not “all consent”</h3>
      <p>
        Some sections of this policy describe processing that relies on consent (for example, the Photobooth photo you actively choose to keep, or the diary content you voluntarily add). Other processing — such as creating the account and couple space you asked for — is necessary to perform the contract. That distinction matters under the DPA and under the NPC’s guidance on valid consent (freely given, specific, informed indication of will). We do not use blanket consent as a substitute for identifying the real basis.
      </p>

      <h2>Recipients — who actually receives personal information</h2>
      <ul>
        <li>
          <strong>Your partner</strong> — within the same Couple space, the two of you share the diary you both add. Invite codes are private to you; anyone with the code could attempt to join, so share it only with your partner.
        </li>
        <li>
          <strong>Processors actually used today:</strong>
          <ul>
            <li>
              <strong>Supabase</strong> (authentication, PostgreSQL, and the provisioned Storage bucket) — processes account, couple, and content data to host the application; subject to Supabase’s terms and privacy documentation;
            </li>
            <li>
              <strong>Vercel</strong> — serves the static front-end; subject to Vercel’s terms and privacy documentation;
            </li>
            <li>
              <strong>OpenStreetMap / Leaflet</strong> — map tiles and client-side rendering for Our Places where you use the map; tile servers will see the usual IP-and-request metadata.
            </li>
            <li>
              <strong>Google OAuth</strong> — only where you choose it and where the operator has enabled it; Supabase then receives the Google-provided identifier to create your session. Not listed if the feature is off in this deployment.
            </li>
          </ul>
        </li>
        <li>We do not sell personal information to any of these providers. They receive information because they provide the underlying services.</li>
      </ul>

      <h2>How we process</h2>
      <p>
        Photos are compressed in your browser before transmission (<code>compressImage</code> / <code>filesToDataUrls</code>), then written via the
        Supabase client to RLS-protected rows; realtime subscriptions may push your own couple’s updates to your other device. Hosting and TLS are
        via the providers above. No additional behavioural analytics pipeline exists in this build to describe.
      </p>

      <h2>Data retention</h2>
      <p>
        The DPA requires retention only for as long as necessary for the purposes described, subject to legal claims, legitimate business purposes,
        or other lawful requirements (Sec. 11; IRR Rule IV, Sec. 19). In operational terms today:
      </p>
      <ul>
        <li>
          <strong>While your account and couple exist:</strong> the content you added is retained so the diary is there when you return;
        </li>
        <li>
          <strong>When you delete a memory / note / place / wishlist item / timeline entry:</strong> the row (and, by cascade, its photos) is
          removed via Supabase; best-effort removal of any provisioned Storage objects is also attempted by the client;
        </li>
        <li>
          <strong>When you leave a Couple:</strong> your membership row is removed; if you were the last member, the orphaned couple row and,
          by cascade, its diary are removed as well;
        </li>
        <li>
          <strong>When you delete your account</strong> (Settings → Delete my account): you see the notice “<em>Deleting your account permanently removes your account and associated Twofold data, subject to any information that must be retained where required or permitted by applicable law.</em>” The RPC <code>delete_own_account</code> leaves all couples, deletes orphaned couples (cascading the diary), deletes your <code>profiles</code> row, and deletes your <code>auth.users</code> row. The client attempts best-effort removal of any Storage objects first.
        </li>
      </ul>
      <p>
        Exact backup-retention windows depend on the infrastructure providers. Deleted content may persist briefly in system backups before rotation;
        we do not promise immediate destruction of every backup copy because the infrastructure does not guarantee that. Where Philippine law requires
        or permits longer retention (for example, to establish, exercise, or defend legal claims), we may retain the minimum necessary for that
        purpose rather than deleting. Placeholders, not invented periods, are used here until the operator defines them with counsel: retention
        periods — [STANDARD OPERATIONAL RETENTION]; backup rotation — [BACKUP ROTATION].
      </p>

      <h2>Your rights as a data subject</h2>
      <p>
        Under the DPA and IRR (Rule IV), you have the following rights, each subject to the qualifications, conditions, and exceptions in the Act
        and NPC issuances (including proportionality, lawful obligations, and the rights of others). We do not promise that every request will be
        granted in full where the Act provides otherwise.
      </p>
      <ul>
        <li>
          <strong>Right to be informed</strong> — this policy and, where appropriate, in-context notices (for example, the invite-code instruction,
          the Photobooth permission prompt) are the primary means you are informed.
        </li>
        <li>
          <strong>Right to access</strong> — you can review most of your information directly in the app (Home, Memories, Notes, Timeline, Places,
          Wishlist, Profile). For anything not directly visible, contact {P.PRIVACY_EMAIL}.
        </li>
        <li>
          <strong>Right to correct / rectify</strong> — you can edit couple profile information, memories, notes, and other diary entries from
          within the app; for account data, contact us.
        </li>
        <li>
          <strong>Right to object</strong> — where processing is based on consent or legitimate interest, you may object as provided by the DPA.
        </li>
        <li>
          <strong>Right to erasure or blocking</strong> — where applicable under the DPA (for example, where data is incomplete, no longer
          necessary, or unlawfully processed), subject to the retention and legal-obligation notes above.
        </li>
        <li>
          <strong>Right to data portability</strong> — where applicable, we will provide personal information you supplied, in a commonly used
          electronic format, where technically feasible. Twofold is a small diary, not a full export platform; reasonable practical limits may
          apply.
        </li>
        <li>
          <strong>Right to damages</strong> — as provided by the DPA (Sec. 16(f), 35–36) and IRR Rule IV, Sec. 34, where harm results from
          unlawful processing.
        </li>
        <li>
          <strong>Right to file a complaint</strong> — you may lodge a complaint with the National Privacy Commission, in accordance with its
          applicable procedures (see “Contact”).
        </li>
      </ul>
      <p>To exercise any of these, contact {P.PRIVACY_EMAIL}. We may need to verify your identity before acting.</p>

      <h2>Privacy notice at collection</h2>
      <p>
        Before or when you create an account, the signup form directs you to this Privacy Policy and tells you, in plain language: what we collect
        (account, couple, diary, and the technical information above), why (to provide the private diary you asked for, on the bases described),
        how (browser compression → Supabase RLS rows / provisioned bucket → Vercel delivery), who receives it (your partner and the processors
        above), how long it is kept (as long as needed for the diary, plus the legal/reactive exceptions noted), who controls it (
        {P.BUSINESS_NAME}, {P.PRIVACY_EMAIL}), and your rights and how to reach us. This section is that notice.
      </p>

      <h2>Security</h2>
      <p>
        We implement reasonable and appropriate organizational, physical, and technical measures appropriate to the risks, as required by the DPA
        (Sec. 20) and IRR Rule IV, Sec. 26 — as actually built today:
      </p>
      <ul>
        <li>Supabase Auth for authentication, with email confirmation and session handling via Supabase;</li>
        <li>Row Level Security on every couple-scoped table (verified in <code>supabase/schema.sql</code>), so non-members cannot read another couple’s private data;</li>
        <li>Private Storage bucket <code>couple-photos</code> provisioned (RLS example policies in the schema, path <code>couple_id/…</code>) — active write path is currently database rows, which are RLS-protected as described;</li>
        <li>restricted database access via RLS (no direct couple data access without membership);</li>
        <li>session persistence via Supabase Auth with refresh, and HTTPS delivery via Vercel.</li>
      </ul>
      <p>
        No system is perfectly secure. We do not claim zero breaches, military-grade encryption beyond what the platform provides, or absolute
        confidentiality. Risk-appropriate measures are used, and access should be limited organizationally as well as technically.
      </p>

      <h2>Data breaches</h2>
      <p>
        Twofold will handle any personal data breach in accordance with the DPA, its IRR, and applicable NPC issuances (including NPC Circular on
        Personal Data Breach Management). This includes evaluating whether a breach must be notified to the NPC and, where required, to affected
        data subjects, in the form and under the qualifications provided by the NPC. No specific deadline is stated here beyond what the applicable
        law and NPC rules require, and not every security incident is automatically a notifiable breach.
      </p>

      <h2>Children</h2>
      <p>
        Twofold is for adults: “You must be 18 or older to use Twofold.” We do not collect date of birth to enforce this, and we do not knowingly
        collect personal information from children. If you believe a child has provided information, contact {P.PRIVACY_EMAIL} so the information can
        be addressed.
      </p>

      <h2>Where the data lives and transfers</h2>
      <p>
        The Supabase project and Vercel deployment region determine where data is physically processed and stored. Where personal information crosses
        borders in the course of providing the diary, the hosting providers’ infrastructure is the mechanism of transfer; the DPA’s cross-border
        considerations and NPC guidance apply as relevant to the operator’s actual deployment. Specific sub-processor regions are as described in the
        processors’ own documentation.
      </p>

      <h2>Your choices and control</h2>
      <ul>
        <li>Do not add content you do not wish to store.</li>
        <li>Delete a memory, note, place, wishlist item, or timeline entry from its page (each delete asks for your confirmation before removing).</li>
        <li>Leave or delete a Couple, or delete your account, from Settings — each asks for explicit confirmation before any removal.</li>
        <li>Manage camera permission in the browser / device settings; the camera is only active while Photobooth is open.</li>
      </ul>

      <h2>Changes to this Privacy Policy</h2>
      <p>
        We may update this policy (current version: {PRIVACY_VERSION}). When changes are material, we will provide notice in the app or via the
        contact you provided, and we will update the Last updated date above. Your continued use after the effective date constitutes your
        understanding of the updated notice. Where consent is the basis for a particular processing activity and the change expands it, we will
        obtain that consent separately.
      </p>

      <h2>Contact us — and the NPC</h2>
      <ul>
        <li>Privacy inquiries / data-subject requests: {P.PRIVACY_EMAIL}</li>
        <li>Legal inquiries: {P.LEGAL_EMAIL}</li>
        <li>General: {P.CONTACT_EMAIL}</li>
        <li>Mailing address: {P.BUSINESS_ADDRESS}</li>
      </ul>
      <p>
        You also have the right, subject to NPC procedures, to lodge a complaint with the <strong>National Privacy Commission</strong> (see{" "}
        <a href="https://privacy.gov.ph/data-subject-rights/" target="_blank" rel="noreferrer">
          privacy.gov.ph/data-subject-rights
        </a>{" "}
        and <a href="https://privacy.gov.ph/data-privacy-act/" target="_blank" rel="noreferrer">
          the DPA
        </a>
        ). Nothing here is intended to limit rights you have under Philippine law.
      </p>

      <h2>Developer checklist — not a claim of compliance</h2>
      <p>The UI/legal pages being added does not by itself make Twofold “fully compliant.” The operator should track, at a minimum:</p>
      <ul>
        <li>Privacy Impact Assessment (PIA) where applicable;</li>
        <li>Records of Processing Activities (ROPA);</li>
        <li>defined retention and disposal schedule (replace the placeholders above with counsel);</li>
        <li>access-control and RLS review, including Storage bucket review when the write path moves;</li>
        <li>security review and vulnerability handling;</li>
        <li>personal data breach procedure, including NPC notification workflow;</li>
        <li>privacy contact / DPO designation and, where legally required, NPC registration/notification;</li>
        <li>regular review of these three documents.</li>
      </ul>
      <p>
        This checklist is a reminder, not a statement that any of the above has been completed. Have a Philippine lawyer or privacy professional
        review the deployment before relying on these pages.
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version {PRIVACY_VERSION} · Based on RA 10173 (DPA 2012), IRR, and NPC guidance. See also <Link to="/terms">Terms</Link> and <Link to="/guidelines">Guidelines</Link>.</p>
    </LegalShell>
  );
}
