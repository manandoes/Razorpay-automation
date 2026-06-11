const axios = require('axios');

// Your WhatsApp bot's send endpoint. Override with WHATSAPP_BOT_URL in env.
const DEFAULT_BOT_URL = 'http://34.28.139.132/send-message';

/**
 * Normalise a raw phone string into the digits-with-country-code shape the bot
 * expects (e.g. "919876543210" — no "+", no spaces).
 */
function normalizePhone(rawPhone) {
  // Default country code, stripped down to digits (e.g. "+91" -> "91").
  const defaultCc = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '+91').replace(/\D/g, '');

  // Drop everything except digits (this also removes a leading "+").
  const digits = String(rawPhone).replace(/\D/g, '');

  // Bare 10-digit local number (typical Indian mobile) — prepend country code.
  if (digits.length === 10) {
    return `${defaultCc}${digits}`;
  }

  // Otherwise assume the country code is already present.
  return digits;
}

/**
 * Build the WhatsApp confirmation message text.
 */
function renderMessage({ name, amount, currency, paymentId }) {
  const eventName = process.env.EVENT_NAME || 'our event';
  return (
    `Hi ${name}, your payment of ${currency} ${amount} is confirmed. ` +
    `Your spot for ${eventName} is booked. ` +
    `Payment ID: ${paymentId}. We look forward to seeing you there!`
  );
}

/**
 * Send a WhatsApp confirmation via the self-hosted bot.
 *
 * POST {WHATSAPP_BOT_URL}
 *   { "phone_number": "919876543210", "message_text": "..." }
 */
async function sendWhatsAppMessage({ name, phone, amount, currency, paymentId }) {
  const botUrl = process.env.WHATSAPP_BOT_URL || DEFAULT_BOT_URL;

  const phoneNumber = normalizePhone(phone);
  const messageText = renderMessage({ name, amount, currency, paymentId });

  const response = await axios.post(
    botUrl,
    { phone_number: phoneNumber, message: messageText, api_key: process.env.WHATSAPP_API_KEY },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  console.log(`[whatsapp] Sent to ${phoneNumber} via bot (status=${response.status})`);
  return response.data;
}

module.exports = { sendWhatsAppMessage, normalizePhone };
