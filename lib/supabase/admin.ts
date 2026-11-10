import { createClient } from "@supabase/supabase-js";

// Never import this module into a Client Component. Service-role credentials
// bypass RLS and must remain on the server.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
