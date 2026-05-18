import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS. Only use in API routes, never in client components.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
