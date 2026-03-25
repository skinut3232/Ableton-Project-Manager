import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, resendReady, SETCRATE_AUDIENCE_ID } from "@/lib/resend";
import { trialWelcome } from "@/lib/email-templates";

// "mac_waitlist" kept for backward compatibility with existing signups
const VALID_SOURCES = ["trial_download", "mac_waitlist"] as const;
type Source = (typeof VALID_SOURCES)[number];

/** Sender address — must match your verified Resend domain. */
const FROM_EMAIL = "Rob from SetCrate <rob@setcrate.app>";

export async function POST(request: Request) {
  try {
    const { email, source = "trial_download" } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!VALID_SOURCES.includes(source as Source)) {
      return NextResponse.json(
        { error: "Invalid source" },
        { status: 400 }
      );
    }

    // 1. Upsert to email_signups (existing behavior, kept for backward compatibility)
    const { error: signupError } = await supabaseAdmin
      .from("email_signups")
      .upsert(
        { email, source },
        { onConflict: "email,source" }
      );

    if (signupError) {
      console.error("[subscribe] email_signups error:", signupError);
    }

    // 2. Upsert to email_contacts (new CRM table)
    const now = new Date().toISOString();
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    if (source === "trial_download") {
      const { error: contactError } = await supabaseAdmin
        .from("email_contacts")
        .upsert(
          {
            email,
            segment: "trial_active",
            trial_started_at: now,
            trial_expires_at: trialExpiresAt,
            updated_at: now,
          },
          { onConflict: "email" }
        );

      if (contactError) {
        console.error("[subscribe] email_contacts error:", contactError);
      }
    }

    // 3. Add contact to Resend audience (best-effort, don't block the response)
    if (resendReady && SETCRATE_AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          audienceId: SETCRATE_AUDIENCE_ID,
          email,
        });
      } catch (resendErr) {
        console.error("[subscribe] Resend audience error:", resendErr);
      }
    }

    // 4. Send trial welcome email via Resend (best-effort)
    if (resendReady && source === "trial_download") {
      try {
        const template = trialWelcome();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: template.subject,
          html: template.html,
        });
        console.log(`[subscribe] Welcome email sent to ${email}`);
      } catch (emailErr) {
        // Don't fail the signup if the email doesn't send
        console.error("[subscribe] Welcome email error:", emailErr);
      }
    }

    console.log(`[subscribe] ${source}: ${email}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
