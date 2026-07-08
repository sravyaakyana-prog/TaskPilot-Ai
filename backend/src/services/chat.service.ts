import { createAgentPlan } from "../agents/planner";
import { saveChatExchange } from "../database/chatStore";
import { createLLMProvider } from "../llm";
import { executeTool } from "../router/toolRouter";

const llm = createLLMProvider();

export async function generateChatReply(
  message: string,
  conversationId?: string
) {
  const plan = createAgentPlan(message);
  const toolResult = await executeTool(plan, message);

  const systemPrompt = `
You are TaskPilot AI.

You are an intelligent productivity agent.

Current Intent:
${plan.intent.intent}

Reason:
${plan.intent.reason}

Tool Required:
${plan.toolRequired}

Tool:
${plan.toolName ?? "None"}

Tool Result:
${toolResult ?? "No tool executed"}

Answer naturally and helpfully.
`;

  const reply = await llm.generateResponse([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  const agentTrace = {
    intent: plan.intent.intent,
    confidence: plan.intent.confidence,
    tool: plan.toolName,
    toolRequired: plan.toolRequired,
    steps: plan.steps,
  };

  const conversation = saveChatExchange({
    conversationId,
    userMessage: message,
    assistantMessage: reply,
    agent: agentTrace,
  });

  return {
    reply,
    conversationId: conversation.id,
    agent: agentTrace,
  };
}