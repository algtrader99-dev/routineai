const express = require("express");

const app = express();

// JSON request-এর জন্য
app.use(express.json({ limit: "20mb" }));

// index.html serve করবে
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";


app.post("/api/analyze", async (req, res) => {

  try {

    const { image, mimeType } = req.body;

    // ছবি পাওয়া গেছে কি না
    if (!image) {

      return res.status(400).json({
        error: "Image পাওয়া যায়নি"
      });

    }


    // API key পাওয়া গেছে কি না
    if (!GEMINI_API_KEY) {

      return res.status(500).json({
        error: "GEMINI_API_KEY server-এ সেট করা হয়নি"
      });

    }


    // Gemini-কে দেওয়া instruction
    const prompt = `
You are an AI school routine assistant.

Read the uploaded school routine image carefully.

Extract every clearly visible routine entry.

For each entry find:

1. Subject or task name
2. Start time
3. Duration in minutes

Return ONLY JSON.

Example:

{
  "routines": [
    {
      "title": "Mathematics",
      "time": "08:00",
      "duration": 45
    },
    {
      "title": "English",
      "time": "09:00",
      "duration": 45
    }
  ]
}

Rules:

- Use 24-hour time.
- Convert AM/PM correctly.
- Extract every clearly readable entry.
- Do not invent subjects.
- Do not invent times.
- If duration is not visible, use 45 minutes.
- If something is unclear, skip it.
`;


    // Gemini API request
    const response = await fetch(GEMINI_URL, {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        "x-goog-api-key": GEMINI_API_KEY

      },

      body: JSON.stringify({

        model: "gemini-3.6-flash",

        input: [

          {
            type: "text",
            text: prompt
          },

          {
            type: "image",
            data: image,
            mime_type: mimeType || "image/jpeg"
          }

        ],

        // JSON output enforce করা
        response_format: {

          type: "text",

          mime_type: "application/json",

          schema: {

            type: "object",

            properties: {

              routines: {

                type: "array",

                items: {

                  type: "object",

                  properties: {

                    title: {
                      type: "string"
                    },

                    time: {
                      type: "string"
                    },

                    duration: {
                      type: "integer"
                    }

                  },

                  required: [
                    "title",
                   