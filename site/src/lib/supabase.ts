import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key.
// These env vars intentionally omit the NEXT_PUBLIC_ prefix
// so they are never bundled into client-side code.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
