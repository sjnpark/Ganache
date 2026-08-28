import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.6-flash";

// One budget of attempts covers BOTH failure modes below, so a call can never
// exceed this many round trips regardless of how it fails.
//
// Held at 2 (initial attempt + one automatic retry) on purpose: a single
// Opportunity Brief generation can take ~90s, so a third attempt would push
// the worst case past four minutes and make a failing demo look hung. We buy
// resilience against one transient blip, not against a sustained outage.
const MAX_ATTEMPTS = 2;

// Delay before each retry, indexed by which retry it is. Only the first entry
// is reachable at MAX_ATTEMPTS = 2; the second is kept so raising the cap
// again stays correct rather than silently sleeping 0ms. There is no delay
// after the final attempt — we fail immediately instead of sleeping
// pointlessly.
const RETRY_DELAY_MS = [1000, 2000];

// Provider-side / rate-limit failures that are worth trying again: the same
// request may well succeed a second later. Everything else (400 bad request,
// 401/403 bad key, 404 wrong model, schema/validation errors) is a real
// problem with our request — retrying it just wastes the user's time and
// hides the actual cause, so those fail immediately.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// The SDK throws ApiError, which carries the HTTP status as a number. We read
// that field rather than pattern-matching the message text, so a "503" that
// merely appears inside some other message can't be mistaken for a real one.
function isTransient(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" && RETRYABLE_STATUS.has(status);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shown to the user when every attempt failed. Deliberately says the request
// did NOT go through: never substitute placeholder content for a failed
// generation (CLAUDE.md Section 9).
function transientFailureMessage(err: unknown): string {
  const status = (err as { status?: number }).status;
  return (
    `Gemini가 일시적으로 응답하지 않아 ${MAX_ATTEMPTS}번 시도했지만 실패했어요` +
    `${status ? ` (HTTP ${status})` : ""}. ` +
    `잠시 후 다시 시도해주세요. 생성된 내용은 없습니다.`
  );
}

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
  // Set only when the API call itself failed transiently. If the loop runs
  // out while this holds an error, the provider — not the JSON — was the
  // problem, and the user gets the transient message instead.
  let lastTransientError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(RETRY_DELAY_MS[attempt - 2]);
    }

    try {
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

      lastTransientError = null;
      lastText = response.text ?? "";
      lastFinishReason = response.candidates?.[0]?.finishReason;

      if (lastText) {
        try {
          return JSON.parse(lastText) as T;
        } catch {
          // Unchanged: bad JSON falls through and spends another attempt.
        }
      }
    } catch (err) {
      // A non-transient error is our bug, not the provider's — surface it now
      // rather than repeating a request that cannot succeed.
      if (!isTransient(err)) throw err;
      lastTransientError = err;
    }
  }

  if (lastTransientError) {
    throw new Error(transientFailureMessage(lastTransientError));
  }

  throw new Error(
    `Gemini did not return valid JSON after ${MAX_ATTEMPTS} attempts ` +
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

  // Same transient-retry policy as generateJson. There is no JSON to recover
  // here, so an empty response is a plain failure rather than a retry reason.
  let lastTransientError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(RETRY_DELAY_MS[attempt - 2]);
    }

    try {
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
    } catch (err) {
      if (!isTransient(err)) throw err;
      lastTransientError = err;
    }
  }

  throw new Error(transientFailureMessage(lastTransientError));
}
