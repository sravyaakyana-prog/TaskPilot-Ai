import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { ChatMessage, LLMProvider } from "./provider";

export class GeminiProvider implements LLMProvider {
  private model;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    this.model = genAI.getGenerativeModel({
     model: "gemini-1.5-flash-8b"
    });
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const prompt = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    return response || "Sorry, I could not generate a response.";
  }
}