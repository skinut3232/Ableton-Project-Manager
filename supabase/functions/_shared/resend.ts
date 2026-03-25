// Shared Resend helper for Supabase Edge Functions (Deno runtime).
// Uses fetch directly since the Resend npm package isn't available in Deno.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Rob from SetCrate <rob@setcrate.app>";

/** Send an email via the Resend API. Returns true on success. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[resend] RESEND_API_KEY not set, skipping send");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[resend] Send failed (${res.status}):`, err);
      return false;
    }

    console.log(`[resend] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error("[resend] Send error:", err);
    return false;
  }
}
