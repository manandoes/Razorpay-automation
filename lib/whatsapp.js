const axios = require('axios');

const INTERAKT_ENDPOINT = 'https://api.interakt.ai/v1/public/message/';

/**
 * Split a raw phone string (e.g. "+919876543210" or "9876543210") into a
 * country code and the local number, which is the shape Interakt expects.
 */
function splitPhone(rawPhone) {
  let digits = String(rawPhone).replace(/[^\d+]/g, '');

  const defaultCc = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '+91';

  if (digits.startsWith('+')) {
    // Heuristic: most country codes are 1-3 digits. Razorpay usually sends
    // E.164 numbers; for India (+91) the local part is 10 digits.
    const withoutPlus = digits.slice(1);
    // Indian numbers: 91 + 10 digits.
    if (withoutPlus.length === 12 && withoutPlus.startsWith('91')) {
      return { countryCode: '+91', phoneNumber: withoutPlus.slice(2) };
    }
    // Fallback: assume a 2-digit country code.
    return { countryCode: `+${withoutPlus.slice(0, 2)}`, phoneNumber: withoutPlus.slice(2) };
  }

  // No country code present — use the configured default.
  if (digits.length > 10 && digits.startsWith('91')) {
    return { countryCode: '+91', phoneNumber: digits.slice(2) };
  }
  return { countryCode: defaultCc, phoneNumber: digits };
}

/**
 * Send a pre-approved WhatsApp template message via the Interakt API.
 *
 * The template referenced by WHATSAPP_TEMPLATE_NAME must already be approved in
 * your Interakt dashboard. The bodyValues below fill the template's {{1}}, {{2}}
 * ... placeholders in order — adjust to match your approved template.
 */
async function sendWhatsAppMessage({ name, phone, amount, currency, paymentId }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  if (!apiKey || !templateName) {
    throw new Error('WHATSAPP_API_KEY and WHATSAPP_TEMPLATE_NAME must be set.');
  }

  const { countryCode, phoneNumber } = splitPhone(phone);

  // Order matters: these map to {{1}}, {{2}}, {{3}} in your approved template.
  // Example template body:
  //   "Hi {{1}}, your payment of {{2}} is confirmed. Payment ID: {{3}}."
  const bodyValues = [name, `${currency} ${amount}`, paymentId];

  const requestBody = {
    countryCode,
    phoneNumber,
    type: 'Template',
    template: {
      name: templateName,
      languageCode,
      bodyValues,
    },
  };

  const response = await axios.post(INTERAKT_ENDPOINT, requestBody, {
    headers: {
      // Interakt uses HTTP Basic auth with the API key as the token.
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  console.log(
    `[whatsapp] Sent template "${templateName}" to ${countryCode}${phoneNumber} (result=${response.data?.result})`
  );
  return response.data;
}

module.exports = { sendWhatsAppMessage, splitPhone };
