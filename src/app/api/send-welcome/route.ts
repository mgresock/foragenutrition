import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    const firstName = (name || user.email.split("@")[0] || "there").split(" ")[0];

    const { error } = await resend.emails.send({
      from: "Forage <hello@foragenutrition.app>",
      to: user.email,
      subject: `Welcome to Forage, ${firstName} 🌱`,
      html: welcomeEmailHtml(firstName),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send welcome error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

function welcomeEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Forage</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#62e23f;border-radius:16px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:10px auto 0;">
                      <path d="M16 26 C16 26 7 21 7 13 C7 8.5 10 6 16 9" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M16 20 C16 20 22 16.5 22 11 C22 8 20 6.5 16 9" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.85"/>
                      <path d="M16 9 L16 26" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
                      <circle cx="16" cy="26" r="1.8" fill="white"/>
                    </svg>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#F2F2F7;font-size:15px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">FORAGE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161a10;border:1px solid #282c20;border-radius:20px;padding:40px 36px;">

              <!-- Headline -->
              <p style="margin:0 0 8px;color:#8E8E93;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Welcome aboard</p>
              <h1 style="margin:0 0 20px;color:#F2F2F7;font-size:28px;font-weight:800;line-height:1.2;">Hey ${firstName}, you're in. 🌱</h1>
              <p style="margin:0 0 28px;color:#8E8E93;font-size:15px;line-height:1.6;">
                Forage is your AI-powered nutrition and grocery savings app. We're here to help you eat smarter, hit your goals, and save money — all in one place.
              </p>

              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${[
                  ["🔥", "Track calories & macros", "Log meals by photo, voice, or brand name"],
                  ["🛒", "AI Grocery List", "High-protein picks tailored to your budget"],
                  ["🥗", "Restaurant AI", "Healthy picks at any restaurant near you"],
                  ["💊", "Supplement Stack", "Track your stack and see its impact on your nutrition"],
                ].map(([emoji, title, desc]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #282c20;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:22px;width:36px;vertical-align:top;padding-top:2px;">${emoji}</td>
                        <td style="padding-left:12px;vertical-align:top;">
                          <p style="margin:0;color:#F2F2F7;font-size:14px;font-weight:600;">${title}</p>
                          <p style="margin:2px 0 0;color:#8E8E93;font-size:13px;">${desc}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://foragenutrition.app/dashboard"
                       style="display:inline-block;background:#62e23f;color:#000000;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
                      Open Forage →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;color:#48484A;font-size:12px;line-height:1.6;">
                You're receiving this because you just created a Forage account.<br/>
                <a href="https://foragenutrition.app" style="color:#48484A;">foragenutrition.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
