import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const origin = new URL(req.url).origin;

    // Generate a recovery link via admin — this also verifies the account exists.
    // If the email has no account, Supabase returns an error.
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
      },
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: "No account found with that email address." },
        { status: 404 }
      );
    }

    const resetLink = data.properties.action_link;
    const firstName = email.split("@")[0];

    // Send branded reset email via Resend
    const { error: sendError } = await resend.emails.send({
      from: "Forage <hello@foragenutrition.app>",
      to: email,
      subject: "Reset your Forage password",
      html: resetEmailHtml(firstName, resetLink),
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

function resetEmailHtml(firstName: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Forage password</title>
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
                  <td style="background:#34C759;border-radius:16px;width:48px;height:48px;text-align:center;vertical-align:middle;">
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
            <td style="background:#1C1C1E;border:1px solid #2C2C2E;border-radius:20px;padding:40px 36px;">

              <!-- Lock icon -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1A2E1F;border:1px solid #2C4A33;border-radius:14px;width:52px;height:52px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:52px;display:block;">🔐</span>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <p style="margin:0 0 8px;color:#8E8E93;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Password Reset</p>
              <h1 style="margin:0 0 16px;color:#F2F2F7;font-size:26px;font-weight:800;line-height:1.2;">Reset your password</h1>
              <p style="margin:0 0 28px;color:#8E8E93;font-size:15px;line-height:1.6;">
                Hey ${firstName}, we received a request to reset the password for your Forage account. Click the button below to choose a new one.
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#34C759;color:#000000;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border:1px solid #2C2C2E;border-radius:12px;padding:0;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#8E8E93;font-size:13px;line-height:1.5;">
                      ⏱ This link expires in <strong style="color:#F2F2F7;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0;color:#48484A;font-size:12px;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <span style="color:#34C759;word-break:break-all;font-size:11px;">${resetLink}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;color:#48484A;font-size:12px;line-height:1.6;">
                You're receiving this because a password reset was requested for your Forage account.<br/>
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
