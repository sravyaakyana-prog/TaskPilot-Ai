import { GoogleGenAI } from "@google/genai";

type LLMGenerateParams = {
  message: string;
  intent?: string;
  userEmail?: string;
  context?: string;
};

type LLMGenerateResult = {
  text: string;
  provider: "gemini" | "mock";
  usedFallback: boolean;
  error?: string;
};

let geminiClient: GoogleGenAI | null = null;

function getEnvNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("PASTE") || apiKey.includes("your_")) {
    throw new Error("GEMINI_API_KEY is missing or invalid.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }

  return geminiClient;
}

function buildPrompt(params: LLMGenerateParams) {
  return `You are TaskPilot AI, a professional AI productivity assistant.

User email:
${params.userEmail || "guest"}

Intent:
${params.intent || "GENERAL_CHAT"}

Rules:
- Reply clearly and practically.
- Keep answers concise.
- Do not claim Gmail, Calendar, or document actions unless a tool actually performed them.
- Help with productivity, Gmail, Calendar, documents, and planning.

Context:
${params.context || "No extra context."}

User message:
${params.message}`;
}

function mockFallbackResponse(params: LLMGenerateParams) {
  const text = params.message.toLowerCase();

  if (text.includes("explain taskpilot") || text.includes("taskpilot ai")) {
    return `TaskPilot AI is a full-stack AI productivity assistant for Gmail, Calendar, documents, and chat history.

It uses an agent pipeline with intent classification, tool routing, MongoDB persistence, and document RAG.

It helps users summarize emails, search messages, create drafts, check schedules, upload documents, and ask questions from files.`;
  }

  if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
    return "Hi! I am TaskPilot AI. I can help with Gmail, Calendar, uploaded documents, chat history, and productivity planning.";
  }

  if (text.includes("what can you do") || text.includes("help")) {
    return `I can help you with:

1. Summarizing unread Gmail messages
2. Searching Gmail emails
3. Creating Gmail drafts
4. Checking your Google Calendar
5. Creating calendar events
6. Uploading and summarizing PDF/TXT documents
7. Saving chat history and continuing previous conversations`;
  }

  return "I understood your message. You can ask me to summarize Gmail, search emails, check your calendar, create drafts, or summarize uploaded documents.";
}

async function generateWithGemini(
  params: LLMGenerateParams
): Promise<LLMGenerateResult> {
  const client = getGeminiClient();

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const maxOutputTokens = getEnvNumber(
    process.env.GEMINI_MAX_OUTPUT_TOKENS,
    200
  );

  console.log("Gemini request started");
  console.log("Model:", model);

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPrompt(params),
          },
        ],
      },
    ],
    config: {
      temperature: 0.3,
      maxOutputTokens,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty response.");
  }

  console.log("Gemini response successful");

  return {
    text,
    provider: "gemini",
    usedFallback: false,
  };
}

export async function generateAIResponse(
  params: LLMGenerateParams
): Promise<LLMGenerateResult> {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();

  if (provider !== "gemini") {
    console.log("Using mock provider because LLM_PROVIDER is not gemini");

    return {
      text: mockFallbackResponse(params),
      provider: "mock",
      usedFallback: false,
    };
  }

  try {
    return await generateWithGemini(params);
  } catch (error: any) {
    console.error("Gemini failed, using fallback:");
    console.error(error.message || error);

    return {
      text: mockFallbackResponse(params),
      provider: "mock",
      usedFallback: true,
      error: error.message || "Gemini failed. Used fallback.",
    };
  }
}