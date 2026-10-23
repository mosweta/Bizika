// src/routes/email.js

// ─────────────────────────────────────────────────────────────
// Low-level sender
// ─────────────────────────────────────────────────────────────
export async function sendEmail(env, { to, subject, html, from, reply_to }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(reply_to ? { reply_to } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`Resend error (${subject}):`, data);
      throw new Error(data?.message || "Email sending failed");
    }

    console.log(`Resend OK (${subject}):`, data?.id);
    return data;
  } catch (err) {
    console.error("Failed to send email:", err);
    throw new Error("Email sending failed");
  }
}

// ─────────────────────────────────────────────────────────────
// Shared layout
// ─────────────────────────────────────────────────────────────
const BRAND_BLUE = "#1E40AF";
const BRAND_NAME = "Bizika LMS";
const BRAND_URL = "https://bizika.pages.dev";
const SUPPORT_EMAIL = "support@bizika.com";

function layout({ preheader, title, subtitle, body, cta, footerNote }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#374151;">
  ${
    preheader
      ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_BLUE}; padding:24px 32px;">
              <div style="color:#ffffff; font-size:18px; font-weight:600; letter-spacing:-0.01em;">
                ${BRAND_NAME}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px; color:#0f172a; font-size:22px; font-weight:600; letter-spacing:-0.01em;">
                ${title}
              </h1>
              ${
                subtitle
                  ? `<p style="margin:0 0 24px; color:#64748b; font-size:14px;">${subtitle}</p>`
                  : `<div style="height:16px;"></div>`
              }

              ${body}

              ${
                cta
                  ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:${BRAND_BLUE}; border-radius:8px;">
                    <a href="${cta.url}"
                       style="display:inline-block; padding:12px 24px; color:#ffffff; font-size:15px; font-weight:500; text-decoration:none;">
                      ${cta.label}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px; color:#64748b; font-size:13px;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 28px; word-break:break-all;">
                <a href="${cta.url}" style="color:${BRAND_BLUE}; font-size:13px; text-decoration:none;">${cta.url}</a>
              </p>`
                  : ""
              }

              ${
                footerNote
                  ? `
              <p style="margin:0; padding-top:20px; border-top:1px solid #e2e8f0; color:#64748b; font-size:13px; line-height:1.5;">
                ${footerNote}
              </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:20px 32px; border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 12px; color:#64748b; font-size:13px;">
                <a href="${BRAND_URL}" style="color:#64748b; text-decoration:none; margin-right:16px;">Website</a>
                <a href="${BRAND_URL}/privacy" style="color:#64748b; text-decoration:none; margin-right:16px;">Privacy</a>
                <a href="${BRAND_URL}/terms" style="color:#64748b; text-decoration:none;">Terms</a>
              </p>
              <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5;">
                &copy; ${year} ${BRAND_NAME}. All rights reserved.
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

// ─────────────────────────────────────────────────────────────
// Email verification
// ─────────────────────────────────────────────────────────────
export async function sendEmailVerification(env, { email, name, verificationLink }) {
  const body = `
    <p style="margin:0 0 20px; color:#374151; font-size:15px; line-height:1.6;">
      Hi ${name || "there"},
    </p>

    <p style="margin:0 0 28px; color:#374151; font-size:15px; line-height:1.6;">
      Thanks for signing up for ${BRAND_NAME}. Confirm your email address (<strong style="color:#0f172a;">${email}</strong>) to finish setting up your account.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border-left:3px solid ${BRAND_BLUE}; border-radius:4px; margin:0 0 24px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0; color:#334155; font-size:13px; line-height:1.5;">
            <strong style="color:#0f172a;">You must verify before you can sign in.</strong> If you didn't create an account, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>
  `;

  return sendEmail(env, {
    from: `${BRAND_NAME} <noreply@resend.com>`,
    to: email,
    subject: `Verify your ${BRAND_NAME} email`,
    html: layout({
      preheader: "Confirm your email to activate your account.",
      title: "Verify your email",
      subtitle: "One click to activate your account.",
      body,
      cta: { label: "Verify email", url: verificationLink },
      footerNote: `Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_BLUE}; text-decoration:none;">${SUPPORT_EMAIL}</a>.`,
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────────────────────
export async function sendPasswordReset(env, { email, name, resetLink }) {
  const body = `
    <p style="margin:0 0 20px; color:#374151; font-size:15px; line-height:1.6;">
      Hi ${name || "there"},
    </p>

    <p style="margin:0 0 28px; color:#374151; font-size:15px; line-height:1.6;">
      Someone requested a password reset for <strong style="color:#0f172a;">${email}</strong>. If that was you, use the button below to choose a new password.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border-left:3px solid ${BRAND_BLUE}; border-radius:4px; margin:0 0 24px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0; color:#334155; font-size:13px; line-height:1.5;">
            <strong style="color:#0f172a;">This link expires in 1 hour.</strong> After that, you'll need to request a new one.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px; color:#0f172a; font-size:13px; font-weight:600;">
      Didn't request this?
    </p>
    <p style="margin:0 0 8px; color:#64748b; font-size:13px; line-height:1.5;">
      You can safely ignore this email. Your password won't change unless you click the link above and set a new one.
    </p>
  `;

  return sendEmail(env, {
    from: `${BRAND_NAME} <noreply@resend.com>`,
    to: email,
    subject: `Reset your ${BRAND_NAME} password`,
    html: layout({
      preheader: "Use the link inside to choose a new password.",
      title: "Reset your password",
      subtitle: "We received a request to reset the password for your account.",
      body,
      cta: { label: "Reset password", url: resetLink },
      footerNote: `Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_BLUE}; text-decoration:none;">${SUPPORT_EMAIL}</a>.`,
    }),
  });
}