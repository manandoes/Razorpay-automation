const axios = require('axios');

function renderEmailHtml({ name, amount, currency, paymentId }) {
  const eventName = process.env.EVENT_NAME || 'our event';
  const formattedAmount = `${currency} ${amount}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Payment Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:28px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Payment Confirmed ✅</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                  Thank you for your payment. Your spot for <strong>${escapeHtml(eventName)}</strong> is confirmed. Here are your payment details:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Amount Paid</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(formattedAmount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Payment ID</td>
                    <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;text-align:right;font-family:monospace;">${escapeHtml(paymentId)}</td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">We look forward to seeing you there!</p>
                <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
                  If you have any questions, simply reply to this email.
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
  const eventName = process.env.EVENT_NAME || 'our event';

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: fromName, email: fromEmail },
      to: [{ email, name }],
      subject: `Payment Confirmed — ${currency} ${amount}`,
      textContent:
        `Hi ${name},\n\n` +
        `Thank you for your payment. Your spot for ${eventName} is confirmed.\n\n` +
        `Amount Paid: ${currency} ${amount}\n` +
        `Payment ID: ${paymentId}\n\n` +
        `We look forward to seeing you there!`,
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
