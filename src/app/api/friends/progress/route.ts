import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminSupabase } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get accepted friendships
  const { data: friendships } = await adminSupabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  if (!friendships || friendships.length === 0) return NextResponse.json({ friends: [] });

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  const today = new Date().toISOString().split("T")[0];

  // Fetch profiles + onboarding goals in parallel for all friends
  const [{ data: profiles }, { data: onboardings }] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", friendIds),
    adminSupabase
      .from("onboarding")
      .select("user_id, goals, meals_per_week")
      .in("user_id", friendIds),
  ]);

  // Fetch today's meal logs for all friends in one query
  const { data: allLogs } = await adminSupabase
    .from("meal_logs")
    .select("user_id, calories, protein_g, carbs_g, fat_g, nutrition_meta")
    .in("user_id", friendIds)
    .gte("logged_at", `${today}T00:00:00`)
    .lte("logged_at", `${today}T23:59:59`)
    .limit(1000);

  // Fetch streaks (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: streakLogs } = await adminSupabase
    .from("meal_logs")
    .select("user_id, logged_at")
    .in("user_id", friendIds)
    .gte("logged_at", thirtyDaysAgo.toISOString())
    .limit(3000);

  function computeStreak(logs: { logged_at: string }[]) {
    const dates = [...new Set(logs.map((l) => l.logged_at.split("T")[0]))].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toISOString().split("T")[0]) streak++;
      else break;
    }
    return streak;
  }

  const friends = (profiles ?? []).map((p) => {
    const ob = onboardings?.find((o) => o.user_id === p.id);
    const todayLogs = allLogs?.filter((l) => l.user_id === p.id) ?? [];
    const friendStreakLogs = streakLogs?.filter((l) => l.user_id === p.id) ?? [];

    const todayCalories = Math.round(todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0));
    const todayProtein = Math.round(todayLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0));
    const todayCarbs = Math.round(todayLogs.reduce((s, l) => s + (l.carbs_g ?? 0), 0));
    const todayFat = Math.round(todayLogs.reduce((s, l) => s + (l.fat_g ?? 0), 0));
    const todaySodium = todayLogs.reduce((s, l) => {
      const meta = l.nutrition_meta as { sodium_mg?: number } | null;
      return s + (meta?.sodium_mg ?? 0);
    }, 0);
    const streak = computeStreak(friendStreakLogs);
    const mealsLogged = todayLogs.length;

    return {
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      goals: ob?.goals ?? [],
      streak,
      mealsLogged,
      today: { calories: todayCalories, protein: todayProtein, carbs: todayCarbs, fat: todayFat, sodium: todaySodium },
    };
  });

  return NextResponse.json({ friends });
}
