import { env } from "../../config/env.js";
import { HttpError } from "../../errors/httpError.js";
import { extractedTaskSchema } from "./aiSchemas.js";

export const extractTasksWithGemini = async (request) => {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(503, "Gemini API key is not configured");
  }

  const model = env.GEMINI_MODEL.replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt(request.text)
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload.error?.message ?? "Gemini request failed"
    );
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return [];
  }

  const parsed = parseJsonArray(text);
  return parsed.map((task) => {
    const taskObject =
      typeof task === "object" && task !== null && !Array.isArray(task)
        ? task
        : {};

    return extractedTaskSchema.parse({
      ...taskObject,
      sourceBlockId: request.sourceBlockId,
      pageId: request.pageId
    });
  });
};

const buildPrompt = (text) => `
Extract actionable tasks from the note below.
Return only a JSON array. Do not include markdown.

Each task must use this shape:
{
  "title": "short task title",
  "priority": "low" | "medium" | "high",
  "dueText": "optional natural language due date from the note",
  "notes": "optional supporting context"
}

Note:
${text}
`;

const parseJsonArray = (text) => {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  const json = match ? match[0] : cleaned;
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed)) {
    throw new HttpError(502, "Gemini returned JSON that was not an array");
  }

  return parsed;
};
