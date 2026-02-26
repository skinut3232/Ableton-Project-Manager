import type { Metadata } from "next";
import LegalNav from "@/components/LegalNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — SetCrate",
  description: "Terms of Service for the SetCrate desktop application, mobile application, and website.",
};

export default function TermsPage() {
  return (
    <>
      <LegalNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="legal-content">
          <h1 className="mb-2 text-4xl font-bold text-heading">Terms of Service</h1>
          <p className="mb-12 text-sm text-muted italic">Last updated: February 26, 2026</p>

          <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the SetCrate desktop application, mobile application, and website located at setcrate.app (collectively, the &ldquo;Service&rdquo;), operated by SetCrate (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).</p>
          <p>By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

          <h2>1. Description of Service</h2>
          <p>SetCrate is a project management tool designed for music producers using Ableton Live. The Service includes a desktop application, an optional mobile companion application, and related cloud sync functionality.</p>

          <h2>2. Accounts</h2>
          <p>You may need to create an account to use certain features of the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate and complete information when creating your account and to update it as necessary.</p>
          <p>You must be at least 13 years of age to use the Service. If you are under 18, you must have permission from a parent or legal guardian.</p>

          <h2>3. Licenses and Purchases</h2>
          <h3>Desktop Application</h3>
          <p>The SetCrate desktop application is available as a one-time purchase. Upon payment, you are granted a non-exclusive, non-transferable, revocable license to install and use the application on your personal devices for personal or professional music production purposes. This license is perpetual for the version purchased and includes updates at our discretion.</p>
          <p>You may not redistribute, resell, sublicense, reverse engineer, decompile, or create derivative works of the application.</p>

          <h3>Mobile Sync Subscription</h3>
          <p>The mobile sync feature is available as an optional subscription. Subscriptions are billed monthly or annually, as selected at the time of purchase. Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date.</p>
          <p>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period — you will retain access to mobile sync until then.</p>

          <h3>Free Trial</h3>
          <p>We offer a 14-day free trial that includes full access to the desktop application and mobile sync. No payment is required to start a trial. At the end of the trial period, you must purchase a license and/or subscription to continue using the Service.</p>

          <h2>4. Payment</h2>
          <p>All payments are processed through our payment provider, LemonSqueezy. By making a purchase, you agree to LemonSqueezy&apos;s terms of service in addition to these Terms. All prices are listed in US dollars unless otherwise stated. You are responsible for any applicable taxes.</p>

          <h2>5. Intellectual Property</h2>
          <p>The Service, including all code, design, graphics, logos, and content, is owned by SetCrate and protected by copyright and other intellectual property laws. These Terms do not grant you any ownership rights in the Service.</p>
          <p>The SetCrate name, logo, and branding are trademarks of SetCrate. You may not use them without prior written permission.</p>

          <h2>6. Your Content and Data</h2>
          <p>You retain ownership of any data you input into the Service, including project names, tags, notes, and other metadata. We do not claim any ownership over your content.</p>
          <p>We store your data to provide the Service, including cloud sync functionality. You are responsible for maintaining your own backups. We are not liable for any loss of data.</p>

          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to the Service or its related systems</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use the Service to transmit malicious code or harmful content</li>
            <li>Share, resell, or redistribute your license to third parties</li>
            <li>Use automated tools to access the Service in a manner that exceeds reasonable use</li>
          </ul>

          <h2>8. Termination</h2>
          <p>We may suspend or terminate your access to the Service at any time if you violate these Terms, with or without notice. Upon termination, your license to use the Service is revoked. Sections that by their nature should survive termination (including intellectual property, limitation of liability, and indemnification) will remain in effect.</p>
          <p>You may terminate your account at any time by contacting us at support@setcrate.app.</p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
          <p>We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We do not warrant that the Service will be compatible with all versions of Ableton Live or all operating systems.</p>

          <h2>10. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, SetCrate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or related to your use of the Service.</p>
          <p>Our total liability for any claim arising from these Terms or the Service shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.</p>

          <h2>11. Indemnification</h2>
          <p>You agree to indemnify and hold harmless SetCrate, its owners, and affiliates from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the Service or violation of these Terms.</p>

          <h2>12. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. If we make material changes, we will notify you by updating the date at the top of this page and, where practical, by email. Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

          <h2>13. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of New Jersey, United States, without regard to its conflict of law provisions.</p>

          <h2>14. Contact</h2>
          <p>If you have any questions about these Terms, contact us at:</p>
          <p><strong>Email:</strong> <a href="mailto:support@setcrate.app">support@setcrate.app</a><br /><strong>Website:</strong> <a href="https://setcrate.app">https://setcrate.app</a></p>
        </article>
      </main>
      <Footer />
    </>
  );
}
