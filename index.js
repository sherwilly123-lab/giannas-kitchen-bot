const express = require("express");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "giannas123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Webhook verification request received");
  console.log("Mode:", mode);
  console.log("Token:", token);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook verification failed!");
    res.sendStatus(403);
  }
});

// Receive messages
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
  
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          
          if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const from = message.from;
            const msgBody = message.text?.body;

            if (!msgBody) continue;

            console.log("Message from:", from);
            console.log("Message body:", msgBody);

            // Get response from Claude
            const claudeResponse = await anthropic.messages.create({
              model: "claude-opus-4-5",
              max_tokens: 1024,
              system: `You are a helpful assistant for Gianna's Kitchen, a restaurant in Hanover, Jamaica. 
              You help customers with menu questions, orders, and general inquiries. 
              Be friendly, warm, and helpful. Keep responses concise and conversational.`,
              messages: [{ role: "user", content: msgBody }],
            });

            const replyText = claudeResponse.content[0].text;
            console.log("Claude reply:", replyText);

            // Send reply via WhatsApp
            await axios.post(
              `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: replyText },
              },
              {
                headers: {
                  Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log("Reply sent successfully!");
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing message:", error.response?.data || error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot is running on port ${PORT}!`);
});
