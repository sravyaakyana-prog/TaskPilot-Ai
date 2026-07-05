import { classifyIntent } from "../intents/classifier";
import { IntentResult } from "../intents/types";

export type AgentPlan = {
  intent: IntentResult;
  toolRequired: boolean;
  toolName: string | null;
  steps: string[];
};

export function createAgentPlan(message: string): AgentPlan {
  const intent = classifyIntent(message);

  switch (intent.intent) {
    case "EMAIL_SUMMARY":
      return {
        intent,
        toolRequired: true,
        toolName: "gmail.summary",
        steps: ["Classify intent", "Search unread emails", "Summarize important messages"],
      };

    case "EMAIL_SEARCH":
      return {
        intent,
        toolRequired: true,
        toolName: "gmail.search",
        steps: ["Classify intent", "Build Gmail search query", "Fetch matching emails", "Format results"],
      };

    case "EMAIL_DRAFT":
      return {
        intent,
        toolRequired: true,
        toolName: "gmail.draft",
        steps: ["Classify intent", "Extract recipient/context", "Draft email", "Ask for confirmation"],
      };

    case "CALENDAR_QUERY":
      return {
        intent,
        toolRequired: true,
        toolName: "calendar.query",
        steps: ["Classify intent", "Read calendar events", "Summarize schedule"],
      };

    case "CALENDAR_CREATE":
      return {
        intent,
        toolRequired: true,
        toolName: "calendar.create",
        steps: ["Classify intent", "Extract event details", "Create draft event", "Ask for confirmation"],
      };

    case "DOCUMENT_QA":
      return {
        intent,
        toolRequired: true,
        toolName: "document.search",
        steps: ["Classify intent", "Search document chunks", "Answer with citations"],
      };

    case "TASK_PLANNING":
      return {
        intent,
        toolRequired: true,
        toolName: "task.planner",
        steps: ["Classify intent", "Analyze priorities", "Create plan"],
      };

    default:
      return {
        intent,
        toolRequired: false,
        toolName: null,
        steps: ["Classify intent", "Respond conversationally"],
      };
  }
}