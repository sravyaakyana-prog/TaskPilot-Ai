import { env } from "../config/env";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import { LLMProvider } from "./provider";

export function createLLMProvider(): LLMProvider {
  if (env.LLM_PROVIDER === "gemini") {
    return new GeminiProvider();
  }

  if (env.LLM_PROVIDER === "mock") {
    return new MockProvider();
  }

  throw new Error(`Unsupported LLM provider: ${env.LLM_PROVIDER}`);
}