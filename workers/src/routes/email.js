
// src/routes/email.js
export async function sendEmail(env, { to, subject, html, from }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html })
    });
    const data = await res.json();
    console.log(`Resend response (${subject}):`, data);
    return data;
  } catch (err) {
    console.error("Failed to send email:", err);
    throw new Error("Email sending failed");
  }
}

export async function sendEmailVerification(env, { email, name, verificationLink }) {
  return sendEmail(env, {
      from: "Pavoc LMS <noreply@resend.com>",
      to: email,
      subject: "Verify Your Email Address • Pavoc LMS",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0; font-family:'Inter', sans-serif; background-color:#f8fafc;">
          <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
            <!-- Header -->
            <div style="text-align:center; margin-bottom:40px;">
              <div style="background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); width:64px; height:64px; border-radius:16px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center;">
                <span style="color:white; font-size:28px; font-weight:600;">P</span>
              </div>
              <h1 style="color:#1e293b; font-size:32px; font-weight:700; margin:0 0 10px;">Welcome to Pavoc LMS</h1>
              <p style="color:#64748b; font-size:16px; margin:0;">Let's get your account verified</p>
            </div>

            <!-- Main Content -->
            <div style="background:white; border-radius:20px; padding:48px; box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.1);">
              <p style="color:#475569; font-size:18px; line-height:28px; margin:0 0 24px;">
                Hello <strong style="color:#1e293b;">${name}</strong>,
              </p>
              
              <p style="color:#475569; font-size:16px; line-height:24px; margin:0 0 32px;">
                Thank you for choosing Pavoc LMS! To complete your registration and access all features, please verify your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center; margin:40px 0;">
                <a href="${verificationLink}" style="display:inline-block; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:white; padding:16px 40px; border-radius:12px; text-decoration:none; font-weight:600; font-size:16px; box-shadow:0 4px 14px 0 rgba(37, 99, 235, 0.3); transition:all 0.3s ease;">
                  Verify Email Address
                </a>
              </div>

              <!-- Alternative Link -->
              <div style="text-align:center; margin:24px 0; padding:16px; background-color:#f1f5f9; border-radius:8px;">
                <p style="color:#64748b; font-size:14px; margin:0 0 8px;">Or copy and paste this link:</p>
                <a href="${verificationLink}" style="color:#2563eb; font-size:14px; word-break:break-all; text-decoration:none;">
                  ${verificationLink}
                </a>
              </div>

              <!-- Expiration Note -->
              <div style="margin:32px 0; padding:16px; background-color:#f0f9ff; border-radius:8px; border-left:4px solid #2563eb;">
                <p style="color:#1e40af; font-size:14px; margin:0; display:flex; align-items:flex-start;">
                  <span style="font-weight:600; margin-right:8px;">⏰ Note:</span>
                  This verification link will expire in 24 hours for security reasons.
                </p>
              </div>

              <!-- Need Help -->
              <div style="border-top:1px solid #e2e8f0; padding-top:32px; margin-top:32px;">
                <p style="color:#64748b; font-size:14px; margin:0;">
                  If you have any questions or need assistance, our support team is here to help at 
                  <a href="mailto:support@pavoclms.com" style="color:#2563eb; text-decoration:none;">support@pavoclms.com</a>
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align:center; margin-top:40px;">
              <p style="color:#94a3b8; font-size:14px; margin:0 0 16px;">
                © ${new Date().getFullYear()} Pavoc LMS. All rights reserved.
              </p>
              <div style="display:flex; justify-content:center; gap:24px;">
                <a href="https://pavoc.pages.dev" style="color:#64748b; font-size:14px; text-decoration:none;">Website</a>
                <a href="#" style="color:#64748b; font-size:14px; text-decoration:none;">Privacy Policy</a>
                <a href="#" style="color:#64748b; font-size:14px; text-decoration:none;">Terms of Service</a>
              </div>
              <p style="color:#94a3b8; font-size:12px; margin:24px 0 0;">
                This email was sent to ${email}. If you didn't create an account with Pavoc LMS, please ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
  });
}

export async function sendPasswordReset(env, { email, name, resetLink }) {
  return sendEmail(env, {
    from: "Pavoc LMS Security <noreply@resend.com>",
      to: email,
      subject: "Reset Your Password • Pavoc LMS",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0; font-family:'Inter', sans-serif; background-color:#fef2f2;">
          <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
            <!-- Header -->
            <div style="text-align:center; margin-bottom:40px;">
              <div style="background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); width:64px; height:64px; border-radius:16px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center;">
                <svg style="width:28px; height:28px; color:white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h1 style="color:#1e293b; font-size:32px; font-weight:700; margin:0 0 10px;">Password Reset Request</h1>
              <p style="color:#64748b; font-size:16px; margin:0;">Secure your account with a new password</p>
            </div>

            <!-- Main Content -->
            <div style="background:white; border-radius:20px; padding:48px; box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.1);">
              <p style="color:#475569; font-size:18px; line-height:28px; margin:0 0 24px;">
                Hi <strong style="color:#1e293b;">${name}</strong>,
              </p>
              
              <p style="color:#475569; font-size:16px; line-height:24px; margin:0 0 32px;">
                We received a request to reset the password for your Pavoc LMS account. Click the button below to create a new password.
              </p>

              <!-- Security Warning -->
              <div style="margin:24px 0; padding:16px; background-color:#fef2f2; border-radius:8px; border-left:4px solid #dc2626;">
                <p style="color:#7f1d1d; font-size:14px; margin:0; display:flex; align-items:flex-start;">
                  <span style="font-weight:600; margin-right:8px;">🔒 Security:</span>
                  If you didn't request this password reset, please secure your account immediately by contacting support.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center; margin:40px 0;">
                <a href="${resetLink}" style="display:inline-block; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:white; padding:16px 40px; border-radius:12px; text-decoration:none; font-weight:600; font-size:16px; box-shadow:0 4px 14px 0 rgba(220, 38, 38, 0.3); transition:all 0.3s ease;">
                  Reset Password
                </a>
              </div>

              <!-- Alternative Link -->
              <div style="text-align:center; margin:24px 0; padding:16px; background-color:#f8fafc; border-radius:8px;">
                <p style="color:#64748b; font-size:14px; margin:0 0 8px;">Or copy and paste this link:</p>
                <a href="${resetLink}" style="color:#dc2626; font-size:14px; word-break:break-all; text-decoration:none;">
                  ${resetLink}
                </a>
              </div>

              <!-- Expiration -->
              <div style="margin:32px 0; padding:16px; background-color:#f0f9ff; border-radius:8px; border-left:4px solid #2563eb;">
                <p style="color:#1e40af; font-size:14px; margin:0; display:flex; align-items:flex-start;">
                  <span style="font-weight:600; margin-right:8px;">⏰ Important:</span>
                  This password reset link is valid for 1 hour. After that, you'll need to request a new one.
                </p>
              </div>

              <!-- Security Tips -->
              <div style="margin:32px 0; padding:20px; background-color:#f8fafc; border-radius:12px;">
                <h3 style="color:#1e293b; font-size:16px; font-weight:600; margin:0 0 12px;">📝 Password Best Practices:</h3>
                <ul style="color:#475569; font-size:14px; line-height:20px; margin:0; padding-left:20px;">
                  <li style="margin-bottom:8px;">Use a combination of letters, numbers, and symbols</li>
                  <li style="margin-bottom:8px;">Avoid using personal information</li>
                  <li style="margin-bottom:8px;">Don't reuse passwords across different websites</li>
                  <li>Consider using a password manager</li>
                </ul>
              </div>

              <!-- Need Help -->
              <div style="border-top:1px solid #e2e8f0; padding-top:32px; margin-top:32px;">
                <p style="color:#64748b; font-size:14px; margin:0;">
                  If you're having trouble or didn't request this reset, please contact our security team immediately at 
                  <a href="mailto:security@pavoclms.com" style="color:#dc2626; text-decoration:none;">security@pavoclms.com</a>
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align:center; margin-top:40px;">
              <p style="color:#94a3b8; font-size:14px; margin:0 0 16px;">
                © ${new Date().getFullYear()} Pavoc LMS. Protecting your account security.
              </p>
              <div style="display:flex; justify-content:center; gap:24px;">
                <a href="https://pavoc.pages.dev" style="color:#64748b; font-size:14px; text-decoration:none;">Website</a>
                <a href="#" style="color:#64748b; font-size:14px; text-decoration:none;">Security Center</a>
                <a href="#" style="color:#64748b; font-size:14px; text-decoration:none;">Contact Support</a>
              </div>
              <p style="color:#94a3b8; font-size:12px; margin:24px 0 0;">
                This is an automated security message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
    `
  });
}
