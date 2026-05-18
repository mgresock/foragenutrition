import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, req.url));

  if (error || !code || !userId) {
    return redirect("/dashboard/settings?whoop=error");
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: process.env.WHOOP_REDIRECT_URI!,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Whoop token exchange failed:", await tokenRes.text());
      return redirect("/dashboard/settings?whoop=error");
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Fetch Whoop user ID
    const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    await adminSupabase.from("whoop_connections").upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      whoop_user_id: profile.user_id?.toString() ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return redirect("/dashboard/settings?whoop=connected");
  } catch (err) {
    console.error("Whoop callback error:", err);
    return redirect("/dashboard/settings?whoop=error");
  }
}
