import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Download-all: returns the signed-in user's data as a JSON attachment.
// RLS scopes every read to their own rows.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(), user_id: user.id, email: user.email,
  };

  const { data: profile } = await supabase.from("profiles")
    .select("display_name, avatar_url, created_at, friend_code, subscription_tier").eq("id", user.id).single();
  out.profile = profile ?? null;

  for (const table of ["onboarding", "meal_logs", "water_logs", "supplements", "weight_logs", "receipts"]) {
    try {
      const { data } = await supabase.from(table).select("*").eq("user_id", user.id).limit(10000);
      out[table] = data ?? [];
    } catch { out[table] = []; }
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="forage-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
