require('dotenv').config();

const http = require('http');
const crypto = require('crypto');

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const body = JSON.stringify({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_test123',
        amount: 50000,
        currency: 'INR',
        email: 'coachyogeshvats.info@gmail.com',
        contact: '+919997589540',
        notes: { name: 'Test User' },
      },
    },
  },
});

const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-razorpay-signature': sig,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', (err) => console.error('Error:', err.message));
req.write(body);
req.end();
