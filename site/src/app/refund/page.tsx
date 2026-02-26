import type { Metadata } from "next";
import LegalNav from "@/components/LegalNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy — SetCrate",
  description: "Refund Policy for the SetCrate desktop application and mobile sync subscription.",
};

export default function RefundPage() {
  return (
    <>
      <LegalNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="legal-content">
          <h1 className="mb-2 text-4xl font-bold text-heading">Refund Policy</h1>
          <p className="mb-12 text-sm text-muted italic">Last updated: February 26, 2026</p>

          <h2>Overview</h2>
          <p>SetCrate offers a <strong>14-day free trial</strong> with full access to all features, including mobile sync. This trial requires no payment and no credit card. We provide this trial so you can fully evaluate the product before making a purchase decision.</p>

          <h2>Desktop Application (One-Time Purchase)</h2>
          <p>Because we offer a generous free trial period, <strong>all sales of the desktop application are final.</strong> We do not offer refunds on completed purchases.</p>
          <p>We believe the 14-day trial gives you ample time to determine if SetCrate is the right tool for your workflow. We encourage you to make full use of the trial before purchasing.</p>

          <h3>Exceptions</h3>
          <p>We may consider a refund on a case-by-case basis if:</p>
          <ul>
            <li>You were charged in error (e.g., duplicate charge)</li>
            <li>A critical technical issue prevents the application from functioning on your system and we are unable to resolve it within a reasonable timeframe</li>
          </ul>
          <p>To request an exception, contact us at support@setcrate.app with a description of the issue. We will respond within 2 business days.</p>

          <h2>Mobile Sync Subscription</h2>
          <p>Subscriptions can be <strong>cancelled at any time.</strong> Cancellation takes effect at the end of your current billing period — you will retain access to mobile sync until then.</p>
          <p>We do not provide partial refunds for unused subscription time. If you cancel mid-cycle, you will continue to have access for the remainder of the period you&apos;ve already paid for.</p>
          <p>If you were charged for a renewal you did not intend (for example, you forgot to cancel before the renewal date), contact us at support@setcrate.app within 7 days of the charge and we will issue a refund for that renewal.</p>

          <h2>How to Request a Refund or Cancel</h2>
          <ul>
            <li><strong>To cancel a subscription:</strong> Log in to your LemonSqueezy customer portal (link provided in your purchase confirmation email) or contact us at support@setcrate.app.</li>
            <li><strong>To request a refund exception:</strong> Email support@setcrate.app with your order number and a description of the issue.</li>
          </ul>

          <h2>Contact</h2>
          <p>If you have any questions about this policy, contact us at:</p>
          <p><strong>Email:</strong> <a href="mailto:support@setcrate.app">support@setcrate.app</a><br /><strong>Website:</strong> <a href="https://setcrate.app">https://setcrate.app</a></p>
        </article>
      </main>
      <Footer />
    </>
  );
}
