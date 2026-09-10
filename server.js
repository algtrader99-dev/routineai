const express = require("express");

const app = express();

app.use(express.json({ limit: "20mb" }));

app.use(express.static(__dirname));

const API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

app.post("/api/analyze", async (req, res) => {
  try {
    const image = req.body.image;
    const mimeType = req.body.mimeType || "image/jpeg";

    if (!image) {
      return res.status(400).json({
        error: "Image পাওয়া যায়নি"
      });
    }

    if (!API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY সেট করা হয়নি"
      });
    }

    const prompt = `
Read this school routine image carefully.

Extract every clearly visible subject/task.

Return ONLY JSON in this format:

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
- Extract all clearly readable entries.
- Do not invent information.
- If duration is not visible, use 45.
`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
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
            mime_type: mimeType
          }
        ]
      })
    });

    const data = await response.json();

    console.log("Gemini response:", JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API error"
      });
    }

    let text = data.output_text || "";

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item && item.type === "text" && item.text) {
          text += item.text;
        }
      }
    }

    text = String(text)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");

      if (start === -1 || end === -1) {
        return res.status(500).json({
          error: "Gemini valid JSON দেয়নি"
        });
      }

      result = JSON.parse(
        text.substring(start, end + 1)
      );
    }

    if (!result.routines || !Array.isArray(result.routines)) {
      return res.status(500).json({
        error: "Routine পাওয়া যায়নি"
      });
    }

    res.json({
      routines: result.routines
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RoutineAI running on port ${PORT}`);
});