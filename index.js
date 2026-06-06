require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const { sendConfirmationEmail } = require('./lib/mailer');
const { sendWhatsAppMessage } = require('./lib/whatsapp');

const app = express();

/**
 * Razorpay signs the webhook with an HMAC-SHA256 of the *raw* request body.
 * We must verify against the exact bytes Razorpay sent, so we capture the raw
 * body here instead of letting express.json() reparse it.
 */
app.use(
  '/webhook',
  express.raw({ type: '*/*', limit: '1mb' })
);

// Normal JSON parsing for any other (non-webhook) routes.
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'razorpay-webhook-server' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

/**
 * Verify the Razorpay webhook signature.
 * @returns {boolean} true if the signature is valid.
 */
function isValidSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');

  // Guard against timingSafeEqual throwing on length mismatch.
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

app.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // req.body is a Buffer here (from express.raw).
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  if (!isValidSignature(rawBody, signature, secret)) {
    console.warn('[webhook] Invalid signature — rejecting request.');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('[webhook] Could not parse body as JSON:', err.message);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const event = payload.event;
  console.log(`[webhook] Received event: ${event}`);

  // Acknowledge fast (within Razorpay's timeout). We only act on payment.captured.
  // Respond 200 first, then do the slow email/WhatsApp work, so Razorpay does
  // not retry the webhook just because the mailer was slow.
  res.status(200).json({ received: true });

  if (event !== 'payment.captured') {
    return;
  }

  try {
    const payment = payload.payload?.payment?.entity || {};

    // Razorpay amounts are in the smallest currency unit (paise for INR).
    const amountPaise = payment.amount || 0;
    const amount = (amountPaise / 100).toFixed(2);
    const currency = payment.currency || 'INR';
    const paymentId = payment.id || 'unknown';

    // Customer details: prefer top-level fields, fall back to notes.
    const notes = payment.notes || {};
    const name = payment.name || notes.name || notes.customer_name || 'Attendee';
    const email = payment.email || notes.email || '';
    const phone = payment.contact || notes.phone || notes.contact || '';

    console.log(
      `[webhook] payment.captured — id=${paymentId} name="${name}" email="${email}" phone="${phone}" amount=${amount} ${currency}`
    );

    const tasks = [];

    if (email) {
      tasks.push(
        sendConfirmationEmail({ name, email, amount, currency, paymentId }).catch((err) =>
          console.error('[email] Failed to send:', err.message)
        )
      );
    } else {
      console.warn('[webhook] No email on payment — skipping email.');
    }

    if (phone) {
      tasks.push(
        sendWhatsAppMessage({ name, phone, amount, currency, paymentId }).catch((err) =>
          console.error('[whatsapp] Failed to send:', err.message)
        )
      );
    } else {
      console.warn('[webhook] No phone on payment — skipping WhatsApp.');
    }

    await Promise.all(tasks);
    console.log(`[webhook] Done processing payment ${paymentId}.`);
  } catch (err) {
    console.error('[webhook] Error while processing payment.captured:', err);
  }
});

// Export the app for Vercel's serverless runtime.
module.exports = app;

// When run directly (local / traditional host), start an HTTP listener.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Razorpay webhook server listening on http://localhost:${port}`);
  });
}
