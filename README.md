# Razorpay Webhook Server

A small, production-ready Express server that listens for Razorpay
`payment.captured` webhooks and, for each successful payment:

1. ✅ Verifies the Razorpay webhook signature (HMAC-SHA256).
2. 📧 Sends a clean HTML confirmation email to the attendee via Gmail SMTP.
3. 💬 Sends an approved WhatsApp template message via the Interakt API.

Deployable to **Vercel** with one command.

---

## Project structure

```
.
├── index.js            # Express app + /webhook handler + signature verification
├── lib/
│   ├── mailer.js       # Gmail SMTP confirmation email (nodemailer)
│   └── whatsapp.js     # Interakt WhatsApp template message (axios)
├── .env.example        # All required environment variables
├── vercel.json         # Vercel deployment config
└── package.json
```

---

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Create your .env from the example and fill in the values
cp .env.example .env      # Windows: copy .env.example .env

# 3. Run it
npm start                 # or: npm run dev  (auto-restart on changes)
```

The server starts on `http://localhost:3000`. Health check: `GET /health`.

To test the webhook locally against real Razorpay events, expose your local
server with a tunnel such as [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# Use the https URL it prints as your Razorpay webhook URL, e.g.
# https://<random>.ngrok-free.app/webhook
```

---

## Environment variables

See [`.env.example`](./.env.example). The required ones are:

| Variable                  | Description                                              |
| ------------------------- | ------------------------------------------------------- |
| `RAZORPAY_WEBHOOK_SECRET` | Secret you set when creating the Razorpay webhook.      |
| `GMAIL_USER`              | Your Gmail address.                                     |
| `GMAIL_APP_PASSWORD`      | 16-character Google **App Password** (not your login).  |
| `WHATSAPP_API_KEY`        | Interakt API key.                                       |
| `WHATSAPP_TEMPLATE_NAME`  | Name of your approved Interakt WhatsApp template.       |

Optional: `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_DEFAULT_COUNTRY_CODE`,
`EVENT_NAME`, `MAIL_FROM_NAME`, `PORT`.

---

## 1. Get a Gmail App Password

A Gmail App Password is a 16-character password that lets nodemailer log in via
SMTP without using your real password.

1. Enable **2-Step Verification** on your Google account:
   <https://myaccount.google.com/security> → *2-Step Verification* → turn on.
   (App Passwords are only available once 2FA is enabled.)
2. Go to **App Passwords**: <https://myaccount.google.com/apppasswords>.
3. Enter an app name (e.g. `razorpay-webhook`) and click **Create**.
4. Google shows a **16-character password** (like `abcd efgh ijkl mnop`).
   Copy it and remove the spaces.
5. Put it in your `.env`:
   ```
   GMAIL_USER=you@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

> Note: Google Workspace accounts may need an admin to allow App Passwords.

---

## 2. Set up a Razorpay webhook and get the secret

1. Log in to the **Razorpay Dashboard** → **Settings** → **Webhooks**
   (<https://dashboard.razorpay.com/app/webhooks>).
2. Click **+ Add New Webhook**.
3. **Webhook URL**: your deployed URL ending in `/webhook`, e.g.
   `https://your-app.vercel.app/webhook` (or your ngrok URL while testing).
4. **Secret**: enter any strong random string. **This exact value** is your
   `RAZORPAY_WEBHOOK_SECRET` — copy it into your `.env` / Vercel env vars.
5. Under **Active Events**, tick **`payment.captured`**.
6. Click **Create Webhook**.

Razorpay will now `POST` to your URL with an `X-Razorpay-Signature` header on
every captured payment. This server verifies that signature before acting.

> **Getting customer name/phone into the payload:** Razorpay includes `email`
> and `contact` on the payment when available. To reliably pass the attendee's
> name (and any custom fields), add them as **notes** when creating the order /
> payment link — e.g. `notes: { name: "Jane Doe" }`. This server reads `notes`
> as a fallback.

---

## 3. Sign up for Interakt and get the API key

[Interakt](https://www.interakt.shop/) is a WhatsApp Business API provider.

1. Sign up at <https://www.interakt.shop/> and complete the WhatsApp Business
   onboarding (connect a phone number, verify your business).
2. Create and submit a **message template** for approval:
   Dashboard → **Templates** → **Create Template**. Use body text with
   placeholders, for example:
   ```
   Hi {{1}}, your payment of {{2}} is confirmed. Payment ID: {{3}}.
   ```
   Wait for WhatsApp to **approve** it. Put its name in
   `WHATSAPP_TEMPLATE_NAME` (this code fills `{{1}}=name`, `{{2}}=amount`,
   `{{3}}=paymentId` — adjust `bodyValues` in [`lib/whatsapp.js`](./lib/whatsapp.js)
   to match your template).
3. Get your API key: Dashboard → **Settings** → **Developer Settings** →
   **API Key**. Copy it into `WHATSAPP_API_KEY`.

> Prefer **Wati** instead? Swap the request in `lib/whatsapp.js` for Wati's
> `/api/v1/sendTemplateMessage` endpoint and its `Bearer` token. The webhook
> flow stays identical.

---

## 4. Deploy to Vercel

1. Install the CLI and log in:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. From the project root, deploy:
   ```bash
   vercel --prod
   ```
3. Add your environment variables (either in the
   **Vercel Dashboard → Project → Settings → Environment Variables**, or via CLI):
   ```bash
   vercel env add RAZORPAY_WEBHOOK_SECRET
   vercel env add GMAIL_USER
   vercel env add GMAIL_APP_PASSWORD
   vercel env add WHATSAPP_API_KEY
   vercel env add WHATSAPP_TEMPLATE_NAME
   ```
   Then redeploy so the variables take effect: `vercel --prod`.
4. Copy your deployment URL and set the Razorpay webhook URL to
   `https://<your-app>.vercel.app/webhook` (see step 2 above).

That's it — captured payments will now trigger a confirmation email and a
WhatsApp message. 🎉

---

## How signature verification works

Razorpay computes `HMAC-SHA256(raw_request_body, RAZORPAY_WEBHOOK_SECRET)` and
sends it as the `X-Razorpay-Signature` header. The server reads the **raw** body
(via `express.raw`) so the bytes match exactly, recomputes the HMAC, and
compares using a constant-time comparison. Requests with a missing or mismatched
signature are rejected with `401`.

The handler responds `200` quickly and then sends the email / WhatsApp message,
so a slow mailer never causes Razorpay to time out and retry.
