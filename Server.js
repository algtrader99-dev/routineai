const express = require("express");

const app = express();

app.use(express.json({ limit: "20mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

app.post("/api/analyze", async (req, res) => {

  try {

    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "Image পাওয়া যায়নি"
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY server-এ সেট করা হয়নি"
      });
    }

    const prompt = `
You are an AI school routine assistant.

Read the uploaded routine image carefully.

Extract every clearly visible routine entry.

For each entry return:

- subject/task name
- start time
- duration in minutes

Return ONLY valid JSON.

Format:

{
  "routines": [
    {
      "title": "Mathematics",
      "time": "08:00",
      "duration": 45
    }
  ]
}

Rules:
- Use 24-hour time.
- Convert AM/PM correctly.
- Do not invent information.
- If duration is not visible, use 45.
- Extract all clearly readable entries.
`;

    const response = await fetch(GEMINI_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },

      body: JSON.stringify({

        model: "gemini-3.8-flash",

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

        ]

      })

    });


    const data = await response.json();


    if (!response.ok) {

      console.error(data);

      return res.status(response.status).json({
        error: data.error?.message || "Gemini API error"
      });

    }


    let text = data.output_text || "";


    if (!text && data.output) {

      for (const item of data.output) {

        if (
          item.type === "text" &&
          item.text
        ) {

          text += item.text;

        }

      }

    }


    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();


    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");


    if (start === -1 || end === -1) {

      return res.status(500).json({
        error: "Gemini valid JSON দেয়নি"
      });

    }


    const jsonText =
      text.substring(start, end + 1);


    const result =
      JSON.parse(jsonText);


    res.json(result);


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});


const PORT =
  process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `RoutineAI backend running on port ${PORT}`
  );

});