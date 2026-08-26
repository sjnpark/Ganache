import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.6-flash";
const MAX_JSON_ATTEMPTS = 3;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Check web/.env.local.");
  }
  return new GoogleGenAI({ apiKey });
}

// Calls Gemini with a system-style instruction + user content, and expects
// back a single JSON object matching the caller's expected shape. Throws if
// the model didn't return parseable JSON.
export async function generateJson<T>(params: {
  instruction: string;
  content: string;
}): Promise<T> {
  const ai = getClient();

  // Even with responseMimeType: "application/json", Gemini occasionally
  // returns truncated/!invalid JSON — observed intermittently on the larger
  // Opportunity Brief schema, with the same prompt succeeding on retry. Retry
  // before failing so one bad roll of the dice doesn't break the user's flow.
  let lastText = "";
  let lastFinishReason: string | undefined;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `${params.instruction}\n\n${params.content}` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    lastText = response.text ?? "";
    lastFinishReason = response.candidates?.[0]?.finishReason;

    if (lastText) {
      try {
        return JSON.parse(lastText) as T;
      } catch {
        // fall through to retry
      }
    }
  }

  throw new Error(
    `Gemini did not return valid JSON after ${MAX_JSON_ATTEMPTS} attempts ` +
      `(finishReason=${lastFinishReason ?? "unknown"}, length=${lastText.length}). ` +
      `Response starts: ${lastText.slice(0, 200)}`
  );
}

// Calls Gemini and returns plain text (no forced JSON), for free-form
// summaries where the output is meant to be read directly, not parsed.
export async function generateText(params: {
  instruction: string;
  content: string;
}): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `${params.instruction}\n\n${params.content}` }],
      },
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
