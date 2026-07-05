import { createLLMProvider } from "../llm";
import { createAgentPlan } from "../agents/planner";
import { executeTool } from "../router/toolRouter";

const llm = createLLMProvider();

export async function generateChatReply(message: string) {
  // Step 1: Intent Classification + Planning
  const plan = createAgentPlan(message);

  // Step 2: Execute Tool (mock for now)
  const toolResult = await executeTool(plan, message);

  // Step 3: Build prompt for LLM
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

  // Step 4: Generate final response
  const reply = await llm.generateResponse([
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: message,
    },
  ]);

  // Step 5: Return structured result
  return {
    reply,
    agent: {
      intent: plan.intent.intent,
      confidence: plan.intent.confidence,
      tool: plan.toolName,
      toolRequired: plan.toolRequired,
      steps: plan.steps,
    },
  };
}