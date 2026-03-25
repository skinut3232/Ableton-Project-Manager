import { Resend } from "resend";

// Server-only Resend client for sending transactional and drip emails.
// RESEND_API_KEY is set in Vercel environment variables (not NEXT_PUBLIC_).
// Falls back to a dummy key during local builds where the env var isn't set —
// the Resend constructor requires a non-empty string, but we guard all API
// calls behind the `resendReady` check so nothing actually sends.
const apiKey = process.env.RESEND_API_KEY || "re_placeholder";
export const resend = new Resend(apiKey);
export const resendReady = !!process.env.RESEND_API_KEY;

// Resend audience ID for the "SetCrate" audience.
// Set this after creating the audience in the Resend dashboard.
// Go to Audiences → SetCrate → copy the ID from the URL.
export const SETCRATE_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "";
