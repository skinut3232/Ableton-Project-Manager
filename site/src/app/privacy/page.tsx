import type { Metadata } from "next";
import LegalNav from "@/components/LegalNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — SetCrate",
  description: "Privacy Policy for the SetCrate desktop application, mobile application, and website.",
};

export default function PrivacyPage() {
  return (
    <>
      <LegalNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="legal-content">
          <h1 className="mb-2 text-4xl font-bold text-heading">Privacy Policy</h1>
          <p className="mb-12 text-sm text-muted italic">Last updated: February 26, 2026</p>

          <p>This Privacy Policy describes how SetCrate (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and protects your information when you use the SetCrate desktop application, mobile application, and website located at setcrate.app (collectively, the &ldquo;Service&rdquo;).</p>

          <h2>1. Information We Collect</h2>

          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Account information:</strong> When you create an account, we collect your email address and password.</li>
            <li><strong>Payment information:</strong> When you make a purchase, payment is processed by our payment provider, LemonSqueezy. We do not directly store your credit card number or banking details. LemonSqueezy may share your name, email, and transaction details with us for license management and customer support.</li>
            <li><strong>Project data:</strong> When using the Service, you may input project names, tags, notes, status information, and other metadata related to your music production projects. This data is stored locally on your device and, if you opt in to mobile sync, on our cloud infrastructure hosted by Supabase.</li>
            <li><strong>Support communications:</strong> If you contact us at support@setcrate.app, we retain the content of those communications to assist you.</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li><strong>License validation:</strong> The desktop application periodically contacts our servers to validate your license key. This transmits your license key and a device identifier.</li>
            <li><strong>Basic analytics:</strong> We may collect anonymous, aggregated usage data such as app version, operating system, and feature usage frequency. This data cannot identify you personally and is used solely to improve the Service.</li>
            <li><strong>Website data:</strong> Our website may use privacy-respecting analytics to collect anonymous visitor data such as page views, referral source, and country. We do not use tracking cookies or third-party advertising trackers.</li>
          </ul>

          <h3>Information We Do NOT Collect</h3>
          <ul>
            <li>We do not access, read, scan, or transmit your Ableton Live project files, audio files, or any content within your music projects.</li>
            <li>We do not collect your IP address for tracking purposes.</li>
            <li>We do not sell, rent, or share your personal information with advertisers.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Process transactions and manage your license</li>
            <li>Sync your project data between devices (if you opt in to mobile sync)</li>
            <li>Respond to customer support requests</li>
            <li>Send important notices about the Service (such as security alerts or changes to these policies)</li>
            <li>Understand how the Service is used so we can improve it</li>
          </ul>
          <p>We do not use your information for advertising or marketing purposes beyond occasional product updates sent to your account email, which you can opt out of at any time.</p>

          <h2>3. Data Storage and Security</h2>
          <ul>
            <li><strong>Local data:</strong> Project data in the desktop application is stored locally on your device. We do not have access to this data unless you enable cloud sync.</li>
            <li><strong>Cloud data:</strong> If you use mobile sync, your project metadata is stored on servers provided by Supabase, which uses Amazon Web Services (AWS) infrastructure. Data is encrypted in transit (TLS) and at rest.</li>
            <li><strong>Authentication:</strong> Account credentials are managed through Supabase Auth with industry-standard security practices including password hashing.</li>
          </ul>
          <p>We take reasonable measures to protect your information, but no method of transmission or storage is 100% secure. We cannot guarantee absolute security.</p>

          <h2>4. Data Sharing</h2>
          <p>We do not sell your personal information. We share your information only in the following circumstances:</p>
          <ul>
            <li><strong>Service providers:</strong> We use third-party services to operate the Service, including Supabase (data hosting and authentication), LemonSqueezy (payment processing), and Cloudflare (website hosting and DNS). These providers only access your data as necessary to perform their services and are bound by their own privacy policies.</li>
            <li><strong>Legal requirements:</strong> We may disclose your information if required by law, regulation, or legal process, or if we believe disclosure is necessary to protect the rights, safety, or property of SetCrate, our users, or the public.</li>
          </ul>

          <h2>5. Data Retention</h2>
          <ul>
            <li>We retain your account and project data for as long as your account is active.</li>
            <li>If you delete your account, we will delete your personal data and project data from our servers within 30 days. Local data on your device is not affected — you manage that yourself.</li>
            <li>Payment transaction records may be retained as required by law or for accounting purposes.</li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> the personal data we hold about you</li>
            <li><strong>Correct</strong> inaccurate personal data</li>
            <li><strong>Delete</strong> your account and associated data by contacting us at support@setcrate.app</li>
            <li><strong>Export</strong> your project data from the application</li>
            <li><strong>Opt out</strong> of any non-essential communications</li>
          </ul>
          <p>To exercise any of these rights, contact us at support@setcrate.app.</p>

          <h3>For EU/EEA Residents</h3>
          <p>If you are located in the European Union or European Economic Area, you have additional rights under the General Data Protection Regulation (GDPR), including the right to data portability, the right to restrict processing, and the right to lodge a complaint with a supervisory authority.</p>

          <h3>For California Residents</h3>
          <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and the right to request deletion. We do not sell personal information as defined under the CCPA.</p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13, we will take steps to delete it promptly.</p>

          <h2>8. Third-Party Links</h2>
          <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties. We encourage you to review their privacy policies.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. If we make material changes, we will notify you by updating the date at the top of this page and, where practical, by email. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

          <h2>10. Contact</h2>
          <p>If you have any questions about this Privacy Policy, contact us at:</p>
          <p><strong>Email:</strong> <a href="mailto:support@setcrate.app">support@setcrate.app</a><br /><strong>Website:</strong> <a href="https://setcrate.app">https://setcrate.app</a></p>
        </article>
      </main>
      <Footer />
    </>
  );
}
