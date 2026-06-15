const axios = require('axios');

function renderEmailHtml({ name, amount, currency, paymentId }) {
  const formattedAmount = `${currency} ${amount}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thank You for Registering – Jira + AI Masterclass</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:28px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Thank You for Registering – Jira + AI Masterclass 🚀</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                  Thank you for registering for the <strong>Jira + AI Masterclass!</strong> 🚀<br/>
                  We're excited to have you join us for an insightful session where you'll learn how to leverage AI within Jira to improve productivity, save time, and work smarter.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">📅 Date</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;">21 June 2026</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">⏰ Time</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;">07:00 PM – 09:00 PM</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Amount Paid</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;">${escapeHtml(formattedAmount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Payment ID</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;font-family:monospace;">${escapeHtml(paymentId)}</td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:16px;line-height:1.5;font-weight:600;">Join the Masterclass on Zoom:</p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;">
                  <a href="https://us06web.zoom.us/j/85725814873?pwd=hb8s3ve7IsVb9RWThGQ5ST89DnJBOS.1" style="color:#0f766e;word-break:break-all;">https://us06web.zoom.us/j/85725814873?pwd=hb8s3ve7IsVb9RWThGQ5ST89DnJBOS.1</a>
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.5;">
                  We recommend joining a few minutes early to ensure a smooth experience.
                </p>

                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;">
                  📞 For any queries or assistance, feel free to contact us at: <strong>9910227730</strong>
                </p>

                <p style="margin:0 0 8px;font-size:16px;line-height:1.5;font-weight:600;">Join Our Community:</p>
                <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5;">
                  Stay updated with future sessions, AI tips, Jira insights, and connect with like-minded professionals.
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;">
                  <a href="https://chat.whatsapp.com/CPlKUYqttoNLdP6OA23BiQ" style="color:#0f766e;word-break:break-all;">https://chat.whatsapp.com/CPlKUYqttoNLdP6OA23BiQ</a>
                </p>

                <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">Looking forward to seeing you in the masterclass!</p>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.5;">
                  Best Regards,<br/>
                  <strong>Team Coach Yogesh Vats</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated confirmation for your payment ${escapeHtml(paymentId)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendConfirmationEmail({ name, email, amount, currency, paymentId }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY must be set.');

  const fromEmail = process.env.BREVO_FROM_EMAIL;
  if (!fromEmail) throw new Error('BREVO_FROM_EMAIL must be set.');

  const fromName = process.env.MAIL_FROM_NAME || 'Event Team';

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: fromName, email: fromEmail },
      to: [{ email, name }],
      subject: `Thank You for Registering – Jira + AI Masterclass`,
      textContent:
        `Hi ${name},\n\n` +
        `Thank you for registering for the Jira + AI Masterclass! 🚀\n` +
        `We're excited to have you join us for an insightful session where you'll learn how to leverage AI within Jira to improve productivity, save time, and work smarter.\n\n` +
        `📅 Date: 21 June 2026\n` +
        `⏰ Time: 07:00 PM – 09:00 PM\n\n` +
        `Join the Masterclass on Zoom:\n` +
        `https://us06web.zoom.us/j/85725814873?pwd=hb8s3ve7IsVb9RWThGQ5ST89DnJBOS.1\n\n` +
        `We recommend joining a few minutes early to ensure a smooth experience.\n\n` +
        `📞 For any queries or assistance, feel free to contact us at: 9910227730\n\n` +
        `Amount Paid: ${currency} ${amount}\n` +
        `Payment ID: ${paymentId}\n\n` +
        `Join Our Community:\n` +
        `Stay updated with future sessions, AI tips, Jira insights, and connect with like-minded professionals.\n` +
        `https://chat.whatsapp.com/CPlKUYqttoNLdP6OA23BiQ\n\n` +
        `Looking forward to seeing you in the masterclass!\n\n` +
        `Best Regards,\n` +
        `Team Coach Yogesh Vats`,
      htmlContent: renderEmailHtml({ name, amount, currency, paymentId }),
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`[email] Sent to ${email} (messageId=${response.data.messageId})`);
  return response.data;
}

module.exports = { sendConfirmationEmail };
