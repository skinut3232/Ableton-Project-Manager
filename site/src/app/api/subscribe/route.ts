import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// "mac_waitlist" kept for backward compatibility with existing signups
const VALID_SOURCES = ["trial_download", "mac_waitlist"] as const;
type Source = (typeof VALID_SOURCES)[number];

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

    // Upsert to Supabase — composite unique index on (email, source) handles duplicates
    const { error } = await supabaseAdmin
      .from("email_signups")
      .upsert(
        { email, source },
        { onConflict: "email,source" }
      );

    if (error) {
      console.error("[subscribe] Supabase error:", error);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
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
