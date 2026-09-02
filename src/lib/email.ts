import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return !!(host && user && pass);
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string,
  username: string
): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromRaw = process.env.SMTP_FROM || user || "noreply@vardsrm.local";
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!isSmtpConfigured()) {
    console.log("\n=======================================================");
    console.log(" [SMTP DEV FALLBACK] Password Reset Requested");
    console.log(` Target User: ${username} <${toEmail}>`);
    console.log(` Reset URL:   ${resetUrl}`);
    console.log(" Configure SMTP_HOST, SMTP_USER, SMTP_PASS in environment to dispatch real emails.");
    console.log("=======================================================\n");
    return { success: true, previewUrl: resetUrl };
  }

  const fromFormatted = fromRaw.includes("<") ? fromRaw : `"VardStream" <${fromRaw}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your VardStream Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #121316; border: 1px solid #27272a; border-radius: 4px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 30px; border-bottom: 1px solid #27272a; background-color: #18191e;">
              <span style="font-family: monospace; font-size: 11px; font-weight: bold; letter-spacing: 0.05em; background: #27272a; color: #a1a1aa; padding: 3px 6px; border-radius: 2px;">VARDSTREAM // AUTH</span>
              <h2 style="margin: 8px 0 0 0; font-size: 18px; color: #ffffff; letter-spacing: -0.02em;">Password Reset Request</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
              <p style="margin: 0 0 16px 0; color: #f4f4f5;">Hello <strong>${username}</strong>,</p>
              <p style="margin: 0 0 24px 0;">We received a request to reset the password for your VardStream account. Click the secure button below to set a new password:</p>
              
              <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #ffffff; border-radius: 2px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 10px 24px; font-family: monospace; font-size: 13px; font-weight: bold; color: #000000; text-decoration: none; text-transform: uppercase;">
                      RESET PASSWORD &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #71717a; margin: 24px 0 0 0;">
                This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 30px; background-color: #0c0d0e; border-top: 1px solid #27272a; font-family: monospace; font-size: 11px; color: #52525b; text-align: center;">
              VardStream Private Media Network
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromFormatted,
      to: toEmail,
      subject: "Reset your VardStream password",
      html: htmlContent,
      text: `Hello ${username},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
    });

    console.log(`[Brevo SMTP] Email dispatched to ${toEmail} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Brevo SMTP Error] Failed to send email to ${toEmail}:`, err);
    throw err;
  }
}
