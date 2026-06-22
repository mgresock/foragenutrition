import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

// Permanently delete the signed-in user's account. Deleting the auth user
// cascades all their rows (FK on delete cascade) including the profile.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account delete error:", error);
    return NextResponse.json({ error: "Could not delete account. Contact support." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
