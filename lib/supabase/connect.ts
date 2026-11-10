import "server-only";

import { getToken } from "@vercel/connect";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_CONNECTOR = "supabase/motionai-studio";

/**
 * Gets a Vercel Connect token scoped to the currently authenticated Supabase user.
 * Call this only from server-side code, and never return the token to the browser.
 */
export async function getSupabaseConnectTokenForCurrentUser(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication is required to request a Supabase Connect token.");
  }

  return getToken(SUPABASE_CONNECTOR, {
    subject: { type: "user", id: user.id }
  });
}
