import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

// Looks up a single user by friend code, returning only safe public fields.
// Runs server-side with the service role so the `profiles` SELECT policy can
// stay locked to own-row — the browser never gets blanket read access.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = (body.code ?? "").toString().trim().toUpperCase().slice(0, 12);
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data: target } = await adminSupabase
    .from("profiles")
    .select("id, display_name")
    .eq("friend_code", code)
    .single();

  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ id: target.id, display_name: target.display_name });
}
