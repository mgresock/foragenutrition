import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Store (or refresh) the signed-in user's web-push subscription.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint, p256dh, auth } = await req.json();
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: String(endpoint).slice(0, 1000), p256dh: String(p256dh), auth: String(auth) },
    { onConflict: "user_id,endpoint" }
  );
  if (error) {
    console.error("push subscribe error:", error);
    return NextResponse.json({ error: "Could not save subscription (run db/feature-tables.sql)." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
