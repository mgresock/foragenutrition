import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { adminSupabase } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Daily reminder cron (protected by CRON_SECRET): nudges users who subscribed to
// push but haven't logged a meal yet today. No-ops cleanly without VAPID keys.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ skipped: "VAPID keys not configured" });
  webpush.setVapidDetails(`mailto:${process.env.VAPID_SUBJECT || "hello@foragenutrition.app"}`, pub, priv);

  let subs: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    const { data } = await adminSupabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").limit(5000);
    subs = (data as typeof subs) ?? [];
  } catch { return NextResponse.json({ skipped: "push_subscriptions table missing" }); }
  if (subs.length === 0) return NextResponse.json({ sent: 0 });

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

  // Which subscribed users already logged today?
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: todays } = await adminSupabase.from("meal_logs")
    .select("user_id").in("user_id", userIds).gte("logged_at", dayStart.toISOString()).limit(5000);
  const loggedToday = new Set((todays ?? []).map((r) => r.user_id));

  let sent = 0;
  const dead: string[] = [];
  for (const s of subs) {
    if (loggedToday.has(s.user_id)) continue; // already logged — don't nag
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "Forage 🌱", body: "You haven't logged today — keep your streak alive.", url: "/dashboard/calories" })
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.id); // subscription expired
    }
  }
  if (dead.length) await adminSupabase.from("push_subscriptions").delete().in("id", dead);

  return NextResponse.json({ sent, cleaned: dead.length });
}
