const express = require("express");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const VERIFY_TOKEN = "giannas123";
const WHATSAPP_TOKEN = "EAAS6bQB48egBRfPrI5c4jxAJok9szpIABnVSO1od995wnPJVtgJGsam1kbHnUC7bbmxlmZASQeFoSGspZBqucHGr1ZAJFQVztE5JkpsBvMJ5eFsNvdmUi5ZBHWTqZCZCZC528pLTSyXPyUCHTae6rjj3Bc3YpqtCHRGjiQZC4dpEYtuZCqzzVvYvRQefYtDBO64vUyKwQWbCqq9p6oHeNr5Y7YnDikKPTvSf4HsFCPu9l7Q2ayvUZCEmOyV0TiwhLwemGZC9ft68JqQeCVPDXlBWzcwDIoZD";
const PHONE_NUMBER_ID = "1117983298070127";

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object) {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (message && message.type === "text") {
      const from = message.from;
      const text = message.text.body;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: text }],
      });
      const reply = response.content[0].text;
      await axios.post(
        `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply },
        },
        {
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
        }
      );
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(3000, () => console.log("Bot is running!"));
