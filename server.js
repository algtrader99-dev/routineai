const express = require("express");
const path = require("path");

const app = express();

app.use(express.json({ limit: "20mb" }));

// Serve index.html
app.use(express.static(__dirname));

// Gemini API
app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "Image পাওয়া যায়নি"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY পাওয়া যায়নি"
      });
    }

    const prompt = `
Read this school routine image carefully.

Extract all clearly visible routine entries.

Return ONLY valid JSON in this format:

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
- If duration is not visible, use 45 minutes.
- Extract every clearly readable subject/task.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API error"
      });
    }

    let text = data.output_text || "";

    if (!text && data.output) {
      for (const item of data.output) {
        if (item.type === "text" && item.text) {
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

    const result = JSON.parse(
      text.substring(start, end + 1)
    );

    res.json(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `RoutineAI running on port ${PORT}`
  );
});
