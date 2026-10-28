import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";
import { env } from "@/lib/env";

/**
 * Trusted server-side admin client with service-role privileges.
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<any>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
