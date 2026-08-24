import { createClient } from "@supabase/supabase-js";

// Server-only client: uses the service_role key, which bypasses Row Level
// Security. Never import this file from a "use client" component — the key
// must stay on the server (it is NOT prefixed with NEXT_PUBLIC_).
export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check web/.env.local."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
