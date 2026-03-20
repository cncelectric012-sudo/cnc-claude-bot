require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ 
  apiKey: process.env.CLAUDE_API_KEY 
});

// ✅ Webhook Verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log('Webhook verified!');
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Message Receive
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (message?.type === 'text') {
        const userMessage = message.text.body;
        const from = message.from;
        console.log(`Message from ${from}: ${userMessage}`);
        const reply = await processWithClaude(userMessage);
        await sendWhatsApp(from, reply);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error:', error);
    res.sendStatus(500);
  }
});

// ✅ Claude Se Jawab Lo
async function processWithClaude(userMessage) {
  const systemPrompt = `
Tum CNC Electric ke business assistant ho.
Tumhara naam hai "CNC Bot".
Tum Roman Urdu mein jawab dete ho jab tak English na manga jaye.
Tum business reporting, sales, aur performance ke baare mein help karte ho.
Agar koi data available nahi to clearly batao.
Short aur clear jawab do.
`;
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });
  return response.content[0].text;
}

// ✅ WhatsApp Pe Reply Bhejo
async function sendWhatsApp(to, message) {
  await axios.post(
    `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    },
    { 
      headers: { 
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      } 
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CNC Claude Bot running on port ${PORT}`));

const PORT = process.env.PORT || 3000;
