// Drip Sender — Supabase Edge Function
// Runs daily via pg_cron. Queries email_contacts for contacts due for
// drip emails, sends via Resend, and updates tracking fields.
// Deploy with: supabase functions deploy drip-sender --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";
import { getTemplate } from "../_shared/email-templates.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SITE_URL = "https://setcrate.app";

// Each drip rule defines: which segment to target, how many days after
// a reference timestamp, and which email template to send.
interface DripRule {
  segment: string;
  dripKey: string;
  daysAfter: number;
  // Which timestamp column to measure days from
  dateColumn: "trial_started_at" | "purchased_at" | "churned_at";
}

const DRIP_RULES: DripRule[] = [
  // Trial onboarding (Day 0 welcome is sent immediately by /api/subscribe)
  { segment: "trial_active", dripKey: "trial_day_3",    daysAfter: 3,  dateColumn: "trial_started_at" },
  { segment: "trial_active", dripKey: "trial_day_7",    daysAfter: 7,  dateColumn: "trial_started_at" },
  { segment: "trial_active", dripKey: "trial_day_10",   daysAfter: 10, dateColumn: "trial_started_at" },
  { segment: "trial_active", dripKey: "trial_expiring",  daysAfter: 12, dateColumn: "trial_started_at" },

  // Post-purchase
  { segment: "customer_desktop", dripKey: "purchase_day_3", daysAfter: 3, dateColumn: "purchased_at" },

  // Win-back (trial expired without purchase)
  { segment: "trial_expired", dripKey: "winback_day_3",  daysAfter: 3,  dateColumn: "churned_at" },
  { segment: "trial_expired", dripKey: "winback_day_10", daysAfter: 10, dateColumn: "churned_at" },
];

// Also handle segment transitions: trial_active -> trial_expired
async function updateExpiredTrials() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("email_contacts")
    .update({ segment: "trial_expired", churned_at: now, updated_at: now })
    .eq("segment", "trial_active")
    .lt("trial_expires_at", now)
    .is("purchased_at", null)
    .select("email");

  if (error) {
    console.error("[drip] Error updating expired trials:", error);
  } else if (data && data.length > 0) {
    console.log(`[drip] Marked ${data.length} contacts as trial_expired`);
  }
}

async function processDripRules() {
  const now = new Date();
  let totalSent = 0;

  for (const rule of DRIP_RULES) {
    // Calculate the target date: contacts whose reference date is exactly
    // N days ago (within a 24-hour window to handle cron timing)
    const targetDate = new Date(now.getTime() - rule.daysAfter * 24 * 60 * 60 * 1000);
    const windowStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = targetDate.toISOString();

    // Query contacts that:
    // 1. Are in the right segment
    // 2. Have the reference date in the target window
    // 3. Haven't already received this drip email
    // 4. Haven't unsubscribed
    let query = supabase
      .from("email_contacts")
      .select("id, email")
      .eq("segment", rule.segment)
      .eq("unsubscribed", false)
      .gte(rule.dateColumn, windowStart)
      .lt(rule.dateColumn, windowEnd);

    // Exclude contacts who already received this email or a later one in the sequence
    query = query.or(`last_drip_sent.is.null,last_drip_sent.neq.${rule.dripKey}`);

    const { data: contacts, error } = await query;

    if (error) {
      console.error(`[drip] Query error for ${rule.dripKey}:`, error);
      continue;
    }

    if (!contacts || contacts.length === 0) continue;

    console.log(`[drip] ${rule.dripKey}: ${contacts.length} contacts to send`);

    for (const contact of contacts) {
      // Build unsubscribe URL with email as identifier
      const unsubUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(contact.email)}`;
      const template = getTemplate(rule.dripKey, unsubUrl);

      if (!template) {
        console.error(`[drip] No template found for ${rule.dripKey}`);
        break;
      }

      const sent = await sendEmail(contact.email, template.subject, template.html);

      if (sent) {
        // Update tracking
        const { error: updateError } = await supabase
          .from("email_contacts")
          .update({
            last_drip_sent: rule.dripKey,
            last_drip_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", contact.id);

        if (updateError) {
          console.error(`[drip] Update error for ${contact.email}:`, updateError);
        }

        totalSent++;
      }
    }
  }

  return totalSent;
}

Deno.serve(async (req: Request) => {
  // Accept POST (from pg_cron) or GET (for manual testing)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  console.log("[drip] Starting drip-sender run...");

  // Step 1: Update segment for expired trials
  await updateExpiredTrials();

  // Step 2: Process all drip rules and send emails
  const totalSent = await processDripRules();

  console.log(`[drip] Run complete. ${totalSent} emails sent.`);

  return new Response(
    JSON.stringify({ success: true, emails_sent: totalSent }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
