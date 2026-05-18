import { adminSupabase } from "./supabase/admin";

export const DEV_EMAILS = ["mcgresock@gmail.com"];
export const FREE_MONTHLY_LIMIT = 15;

export type Tier = "free" | "pro";

export async function getUserTier(userId: string, email: string): Promise<Tier> {
  if (DEV_EMAILS.includes(email.toLowerCase())) return "pro";
  const { data } = await adminSupabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();
  return (data?.subscription_tier as Tier) ?? "free";
}

// Call this before every AI request. Returns whether the request is allowed.
export async function checkAiAccess(
  userId: string,
  email: string
): Promise<{ allowed: boolean; tier: Tier; remaining: number | null }> {
  const tier = await getUserTier(userId, email);
  if (tier === "pro") return { allowed: true, tier, remaining: null };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await adminSupabase
    .from("profiles")
    .select("ai_requests_month, ai_requests_reset_at")
    .eq("id", userId)
    .single();

  let count = data?.ai_requests_month ?? 0;

  // Reset counter if we've rolled into a new month
  if (!data?.ai_requests_reset_at || data.ai_requests_reset_at < monthStart) {
    count = 0;
    await adminSupabase
      .from("profiles")
      .update({ ai_requests_month: 0, ai_requests_reset_at: monthStart })
      .eq("id", userId);
  }

  if (count >= FREE_MONTHLY_LIMIT) {
    return { allowed: false, tier, remaining: 0 };
  }

  await adminSupabase
    .from("profiles")
    .update({ ai_requests_month: count + 1 })
    .eq("id", userId);

  return { allowed: true, tier, remaining: FREE_MONTHLY_LIMIT - count - 1 };
}
