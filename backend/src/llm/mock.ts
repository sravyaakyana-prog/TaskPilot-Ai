import { ChatMessage, LLMProvider } from "./provider";

function extractSection(systemPrompt: string, startMarker: string, endMarker: string) {
  const startIndex = systemPrompt.indexOf(startMarker);

  if (startIndex === -1) return null;

  const afterStart = systemPrompt.slice(startIndex + startMarker.length).trim();
  const endIndex = afterStart.indexOf(endMarker);

  return endIndex === -1 ? afterStart.trim() : afterStart.slice(0, endIndex).trim();
}

function extractToolResult(systemPrompt: string) {
  const toolResult = extractSection(systemPrompt, "Tool Result:", "Rules:");

  if (
    !toolResult ||
    toolResult.toLowerCase().includes("no tool executed")
  ) {
    return null;
  }

  return toolResult;
}

function extractConversationContext(systemPrompt: string) {
  const context = extractSection(systemPrompt, "Conversation Context:", "Current Intent:");

  if (
    !context ||
    context.toLowerCase().includes("no previous context available")
  ) {
    return null;
  }

  return context;
}

function isMemoryQuestion(message: string) {
  const text = message.toLowerCase();

  return (
    text.includes("what did i") ||
    text.includes("what was my") ||
    text.includes("what do you remember") ||
    text.includes("remember what") ||
    text.includes("previous message") ||
    text.includes("earlier") ||
    text.includes("before")
  );
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

    const conversationContext = extractConversationContext(systemMessage);

    if (conversationContext && isMemoryQuestion(userMessage)) {
      return `Based on this conversation, here is what I remember:

${conversationContext}`;
    }

    return `I understand your request: "${userMessage}". The agent pipeline is working successfully.`;
  }
}