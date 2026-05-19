import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS. Only use in API routes, never in client components.
// Lazy singleton so module-level import doesn't throw during Next.js build page-data collection.
let _adminSupabase: SupabaseClient | null = null;

export const adminSupabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    if (!_adminSupabase) {
      _adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    const value = (_adminSupabase as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(_adminSupabase) : value;
  },
});
