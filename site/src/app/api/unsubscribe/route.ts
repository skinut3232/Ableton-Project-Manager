import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Unsubscribe endpoint for drip emails.
 * Called via GET with ?email=... parameter from the unsubscribe link in emails.
 * Returns a simple HTML page confirming the unsubscribe.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return new NextResponse(unsubscribePage("Missing email parameter."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Set unsubscribed = true in email_contacts
  const { error } = await supabaseAdmin
    .from("email_contacts")
    .update({
      unsubscribed: true,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) {
    console.error("[unsubscribe] Error:", error);
    return new NextResponse(
      unsubscribePage("Something went wrong. Please try again or email support@setcrate.app."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  console.log(`[unsubscribe] ${email}`);

  return new NextResponse(
    unsubscribePage("You've been unsubscribed from SetCrate emails. You won't receive any more messages from us."),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

/** Simple confirmation page matching the SetCrate dark theme. */
function unsubscribePage(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unsubscribe | SetCrate</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0B; color: #E4E4E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
  <div style="text-align: center; max-width: 400px; padding: 40px 24px;">
    <h1 style="color: #FAFAFA; font-size: 20px; font-weight: 600; margin-bottom: 16px;">SetCrate</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #A1A1AA;">${message}</p>
    <p style="margin-top: 24px;"><a href="https://setcrate.app" style="color: #6366F1; text-decoration: none;">Back to setcrate.app</a></p>
  </div>
</body>
</html>`.trim();
}
