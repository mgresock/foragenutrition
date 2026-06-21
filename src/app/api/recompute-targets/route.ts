import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { computeTargets, goalFromGoals, adaptiveCalories, macrosForCalories } from "@/lib/nutrition";

// Adaptive targets engine. POST recomputes the signed-in user's calorie/macro
// targets from their bodyweight trend + profile; GET is the weekly Vercel Cron
// batch (protected by CRON_SECRET) that recomputes every user. Degrades
// gracefully when the weight_logs table / target columns aren't migrated yet.

export const maxDuration = 60;

type Row = Record<string, unknown>;

function weeklyTrend(logs: { logged_at: string; weight_kg: number }[] | null): number | null {
  if (!logs || logs.length < 2) return null;
  const s = [...logs].sort((a, b) => +new Date(a.logged_at) - +new Date(b.logged_at));
  const first = s[0], last = s[s.length - 1];
  const days = (+new Date(last.logged_at) - +new Date(first.logged_at)) / 86400000;
  if (days < 3) return null;
  return ((Number(last.weight_kg) - Number(first.weight_kg)) / days) * 7;
}

async function recomputeForUser(ob: Row): Promise<{ userId: string; calories: number; trend: number | null }> {
  const userId = String(ob.user_id);
  let trend: number | null = null;
  let currentWeight = ob.weight_kg as number | undefined;

  try {
    const since = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data: wlogs } = await adminSupabase
      .from("weight_logs").select("logged_at, weight_kg")
      .eq("user_id", userId).gte("logged_at", since)
      .order("logged_at", { ascending: true }).limit(60);
    if (wlogs && wlogs.length) {
      trend = weeklyTrend(wlogs as { logged_at: string; weight_kg: number }[]);
      currentWeight = Number(wlogs[wlogs.length - 1].weight_kg);
    }
  } catch { /* weight_logs not migrated yet — fall back to onboarding weight */ }

  const base = computeTargets({
    sex: ob.sex as string, age: ob.age as number, height_cm: ob.height_cm as number,
    weight_kg: currentWeight, activity: ob.activity_level as string, goal: goalFromGoals(ob.goals),
  });
  const calories = adaptiveCalories(base, trend);
  const macros = macrosForCalories(calories, currentWeight ?? (ob.weight_kg as number) ?? 80, base.goal);

  await adminSupabase.from("onboarding").update({
    daily_calorie_target: calories,
    protein_target: macros.protein_g,
    carbs_target: macros.carbs_g,
    fat_target: macros.fat_g,
    targets_updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return { userId, calories, trend };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: rows } = await adminSupabase
    .from("onboarding").select("*").not("weight_kg", "is", null).limit(5000);
  let count = 0;
  for (const ob of (rows ?? []) as Row[]) {
    try { await recomputeForUser(ob); count++; } catch { /* skip a bad row */ }
  }
  return NextResponse.json({ recomputed: count });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: ob } = await supabase.from("onboarding").select("*").eq("user_id", user.id).single();
  if (!ob) return NextResponse.json({ error: "Complete onboarding first" }, { status: 404 });
  try {
    const result = await recomputeForUser({ ...(ob as Row), user_id: user.id });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Recompute failed (run db/feature-tables.sql to enable saved targets)" }, { status: 503 });
  }
}
