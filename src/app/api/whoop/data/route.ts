import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminSupabase } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

async function refreshToken(userId: string, refreshToken: string) {
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await adminSupabase.from("whoop_connections").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tokens.access_token as string;
}

async function whoopGet(path: string, token: string) {
  const res = await fetch(`https://api.prod.whoop.com/developer/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false });

  const { data: conn } = await adminSupabase
    .from("whoop_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!conn) return NextResponse.json({ connected: false });

  // Refresh token if expired
  let token = conn.access_token;
  if (new Date(conn.expires_at) <= new Date()) {
    const refreshed = await refreshToken(user.id, conn.refresh_token);
    if (!refreshed) return NextResponse.json({ connected: true, error: "token_expired" });
    token = refreshed;
  }

  const [recovery, sleep, workout] = await Promise.all([
    whoopGet("/recovery?limit=1", token),
    whoopGet("/activity/sleep?limit=1", token),
    whoopGet("/activity/workout?limit=1", token),
  ]);

  const r = recovery?.records?.[0];
  const s = sleep?.records?.[0];
  const w = workout?.records?.[0];

  return NextResponse.json({
    connected: true,
    recovery: r ? {
      score: r.score?.recovery_score ?? null,
      hrv: r.score?.hrv_rmssd_milli ? Math.round(r.score.hrv_rmssd_milli) : null,
      resting_hr: r.score?.resting_heart_rate ?? null,
      spo2: r.score?.spo2_percentage ?? null,
    } : null,
    sleep: s ? {
      performance: s.score?.sleep_performance_percentage ? Math.round(s.score.sleep_performance_percentage) : null,
      efficiency: s.score?.sleep_efficiency_percentage ? Math.round(s.score.sleep_efficiency_percentage) : null,
      duration_hours: s.end && s.start
        ? Math.round(((new Date(s.end).getTime() - new Date(s.start).getTime()) / 3600000) * 10) / 10
        : null,
    } : null,
    strain: w ? {
      score: w.score?.strain ? Math.round(w.score.strain * 10) / 10 : null,
      avg_hr: w.score?.average_heart_rate ?? null,
      kilojoules: w.score?.kilojoule ? Math.round(w.score.kilojoule) : null,
    } : null,
  });
}
