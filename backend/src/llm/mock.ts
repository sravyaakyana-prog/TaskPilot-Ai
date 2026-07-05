import { ChatMessage, LLMProvider } from "./provider";

function extractToolResult(systemPrompt: string) {
  const marker = "Tool Result:";
  const startIndex = systemPrompt.indexOf(marker);

  if (startIndex === -1) return null;

  const afterToolResult = systemPrompt.slice(startIndex + marker.length).trim();

  const endMarker = "Answer naturally and helpfully.";
  const endIndex = afterToolResult.indexOf(endMarker);

  const cleanedResult =
    endIndex === -1
      ? afterToolResult.trim()
      : afterToolResult.slice(0, endIndex).trim();

  if (!cleanedResult || cleanedResult.toLowerCase().includes("no tool executed")) {
    return null;
  }

  return cleanedResult;
}

export class MockProvider implements LLMProvider {
  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const systemMessage =
      messages.find((message) => message.role === "system")?.content || "";

    const userMessage =
      messages.find((message) => message.role === "user")?.content || "";

    const toolResult = extractToolResult(systemMessage);

    if (toolResult) {
      return toolResult;
    }

    return `I understand your request: "${userMessage}". The agent pipeline is working successfully.`;
  }
}