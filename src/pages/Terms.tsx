import { Link } from "react-router-dom";
import LegalShell from "../components/LegalShell";

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" intro="Last updated September 22, 2026">
      <h2>The short version</h2>
      <p>Twofold is a private digital scrapbook for couples. You can keep photos, memories, notes, places, milestones, and wishlists together in one place.</p>
      <p>Be honest about who you are, only upload content you’re allowed to share, respect your partner’s privacy, and don’t use Twofold for anything illegal, abusive, or harmful.</p>
      <p>
        By creating an account, you agree to these Terms and our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Who we are</h2>
      <p>Twofold is operated by <strong>Isaiah Serrano</strong>.</p>
      <p>These Terms are an agreement between you and Isaiah Serrano.</p>
      <p>Contact: <a href="mailto:saulisaiah24@gmail.com">saulisaiah24@gmail.com</a></p>

      <h2>Your account</h2>
      <p>You must be 18 years old or older to use Twofold.</p>
      <p>You are responsible for keeping your account credentials secure and for activity carried out through your account.</p>
      <p>You must provide accurate information and must not create an account pretending to be another person.</p>

      <h2>Your content</h2>
      <p>You keep ownership of the photos, memories, notes, places, milestones, wishlist items, and other content you add to Twofold.</p>
      <p>By uploading content, you give Twofold permission to store, process, display, and deliver that content as necessary to provide the service to you and the people you intentionally share it with.</p>
      <p>We do not claim ownership of your personal content.</p>
      <p>You are responsible for making sure you have the right to upload and share anything you add to Twofold.</p>

      <h2>Private couple content</h2>
      <p>Twofold is designed for private sharing between couples.</p>
      <p>Do not share another person’s private information, photos, or content without their permission.</p>
      <p>Your couple’s content is intended to be accessible only to members of that couple through the application’s access controls. You are also responsible for protecting your own account and devices.</p>

      <h2>Acceptable use</h2>
      <p>Don’t use Twofold to:</p>
      <ul>
        <li>Upload illegal, abusive, threatening, or harmful content</li>
        <li>Harass, threaten, or impersonate another person</li>
        <li>Upload content you don’t have permission to share</li>
        <li>Access another person’s account or private data</li>
        <li>Circumvent security or access controls</li>
        <li>Disrupt, overload, or abuse the service</li>
        <li>Use Twofold for unlawful activities</li>
      </ul>

      <h2>Your privacy</h2>
      <p>Twofold may process information such as your account details, couple membership, photos, memories, notes, places, milestones, and wishlist information.</p>
      <p>
        How this information is collected, used, stored, and protected is explained in our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Account deletion</h2>
      <p>You can delete your Twofold account through the account settings available in the app.</p>
      <p>Deleting your account may permanently remove your account and associated content. Certain information may be retained when required by law or reasonably necessary for security or legal purposes.</p>

      <h2>Service availability</h2>
      <p>We work to keep Twofold available and functional, but we do not guarantee uninterrupted or error-free service.</p>
      <p>Features may change, be improved, or be removed as Twofold develops.</p>

      <h2>Third-party services</h2>
      <p>Twofold uses third-party services to operate parts of the application, including services for authentication, database storage, file storage, hosting, and maps.</p>
      <p>Those services may have their own terms and privacy policies.</p>
      <p>We are not responsible for services or websites that we do not control.</p>

      <h2>Suspension and termination</h2>
      <p>We may suspend or restrict an account if it is being used in violation of these Terms, to harm other users, or to abuse the service.</p>
      <p>You may stop using Twofold and delete your account at any time.</p>

      <h2>No warranty</h2>
      <p>Twofold is provided on an “as is” and “as available” basis.</p>
      <p>We make reasonable efforts to maintain the service, but we do not guarantee that it will always be available, secure, or free from errors.</p>

      <h2>Limitation of liability</h2>
      <p>To the fullest extent permitted by applicable law, Twofold will not be responsible for indirect, incidental, or consequential losses arising from your use of the service.</p>
      <p>Nothing in these Terms is intended to remove or limit rights that cannot legally be excluded under Philippine law.</p>

      <h2>Governing law</h2>
      <p>These Terms are governed by the laws of the Republic of the Philippines.</p>
      <p>Any dispute will be handled in accordance with applicable Philippine law and the appropriate courts or authorities in the Philippines.</p>
      <p>
        Before starting a formal dispute, please contact us at <a href="mailto:saulisaiah24@gmail.com">saulisaiah24@gmail.com</a> so we can try to
        resolve the issue.
      </p>

      <h2>Changes to these Terms</h2>
      <p>We may update these Terms when Twofold changes or when legal or operational requirements change.</p>
      <p>For meaningful changes, we will update the date at the top of this page and provide notice where appropriate.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms:</p>
      <p>
        Isaiah Serrano
        <br />
        <a href="mailto:saulisaiah24@gmail.com">saulisaiah24@gmail.com</a>
      </p>

      <p className="text-[12px] text-[#B6AA99]">Version 1.0 · Last updated September 22, 2026</p>
    </LegalShell>
  );
}
