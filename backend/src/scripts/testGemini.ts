import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY missing in backend/.env");
    }

    console.log("Testing Gemini...");
    console.log("Model:", model);
    console.log("API key loaded:", apiKey.slice(0, 8) + "...");

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model,
      contents: "Reply in one short sentence: Gemini is working.",
      config: {
        maxOutputTokens: 100,
        temperature: 0.3,
      },
    });

    console.log("Gemini response:");
    console.log(response.text);
  } catch (error: any) {
    console.error("Gemini test failed:");
    console.error(error.message || error);
  }
}

testGemini();