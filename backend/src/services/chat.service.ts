import { saveChatTurn } from "../database/chatStore";
import { classifyIntent } from "../intents/classifier";
import { searchDocumentTool } from "../tools/document/document.search";
import { generateAIResponse } from "./llm.service";
import { getCurrentUserEmail } from "../utils/currentUser";

type AgentTrace = {
  intent: string;
  confidence: number;
  tool: string | null;
  toolRequired: boolean;
  steps: string[];
};

type ChatServiceResponse = {
  success: boolean;
  reply: string;
  conversationId: string | null;
  agent: AgentTrace;
  userEmail: string;
};

function getToolForIntent(intent: string) {
  const toolMap: Record<string, string | null> = {
    EMAIL_SUMMARY: "gmail.summary",
    EMAIL_SEARCH: "gmail.search",
    EMAIL_DRAFT: "gmail.draft",
    CALENDAR_QUERY: "calendar.query",
    CALENDAR_CREATE: "calendar.create",
    DOCUMENT_QA: "document.search",
    TASK_PLANNING: null,
    GENERAL_CHAT: null,
  };

  return toolMap[intent] ?? null;
}

function createAgentTrace(
  intent: string,
  confidence: number,
  tool: string | null
): AgentTrace {
  return {
    intent,
    confidence,
    tool,
    toolRequired: Boolean(tool),
    steps: [
      "Classified user intent",
      tool ? `Selected tool: ${tool}` : "No external tool required",
      tool ? "Executed tool" : "Generated response with LLM provider",
      "Prepared final response",
    ],
  };
}

async function loadToolFunction(
  modulePath: string,
  possibleExportNames: string[]
) {
  try {
    const moduleExports: Record<string, any> = await import(modulePath);

    for (const exportName of possibleExportNames) {
      if (typeof moduleExports[exportName] === "function") {
        return moduleExports[exportName];
      }
    }

    if (typeof moduleExports.default === "function") {
      return moduleExports.default;
    }

    return null;
  } catch {
    return null;
  }
}

async function callToolFunction(toolFunction: any, message: string) {
  try {
    return await toolFunction(message);
  } catch {
    return await toolFunction({
      message,
      query: message,
      prompt: message,
    });
  }
}

async function runExternalTool(tool: string, message: string) {
  if (tool === "document.search") {
    return searchDocumentTool(message);
  }

  if (tool === "gmail.summary") {
    const toolFunction = await loadToolFunction("../tools/gmail/gmail.summary", [
      "summarizeUnreadEmailsTool",
      "summarizeGmailTool",
      "gmailSummaryTool",
      "getUnreadEmailSummary",
      "summarizeUnreadEmails",
      "run",
    ]);

    if (!toolFunction) {
      return {
        success: false,
        message: "Gmail summary tool is not available.",
      };
    }

    return callToolFunction(toolFunction, message);
  }

  if (tool === "gmail.search") {
    const toolFunction = await loadToolFunction("../tools/gmail/gmail.search", [
      "searchGmailTool",
      "searchEmailsTool",
      "gmailSearchTool",
      "searchEmails",
      "searchGmail",
      "run",
    ]);

    if (!toolFunction) {
      return {
        success: false,
        message: "Gmail search tool is not available.",
      };
    }

    return callToolFunction(toolFunction, message);
  }

  if (tool === "gmail.draft") {
    const toolFunction = await loadToolFunction("../tools/gmail/gmail.draft", [
      "createGmailDraftTool",
      "draftEmailTool",
      "gmailDraftTool",
      "createDraft",
      "createGmailDraft",
      "run",
    ]);

    if (!toolFunction) {
      return {
        success: false,
        message: "Gmail draft tool is not available.",
      };
    }

    return callToolFunction(toolFunction, message);
  }

  if (tool === "calendar.query") {
    const toolFunction = await loadToolFunction(
      "../tools/calendar/calendar.query",
      [
        "queryCalendarTool",
        "calendarQueryTool",
        "getCalendarEventsTool",
        "getCalendarEvents",
        "queryCalendar",
        "run",
      ]
    );

    if (!toolFunction) {
      return {
        success: false,
        message: "Calendar query tool is not available.",
      };
    }

    return callToolFunction(toolFunction, message);
  }

  if (tool === "calendar.create") {
    const toolFunction = await loadToolFunction(
      "../tools/calendar/calendar.create",
      [
        "createCalendarEventTool",
        "calendarCreateTool",
        "createEventTool",
        "createCalendarEvent",
        "createEvent",
        "run",
      ]
    );

    if (!toolFunction) {
      return {
        success: false,
        message: "Calendar create tool is not available.",
      };
    }

    return callToolFunction(toolFunction, message);
  }

  return {
    success: false,
    message: "Selected tool is not supported yet.",
  };
}

function formatToolResult(tool: string, result: any) {
  if (!result) {
    return "The tool did not return a response.";
  }

  if (typeof result === "string") {
    return result;
  }

  if (result.success === false) {
    return result.error || result.message || "Tool execution failed.";
  }

  if (tool === "document.search") {
  if (result.answer) {
    return `📄 Document Answer

${result.answer}`;
  }

  return result.message || "No document answer found.";
}

  if (result.reply) {
    return result.reply;
  }

  if (result.answer) {
    return result.answer;
  }

  if (result.message) {
    return result.message;
  }

  if (result.summary) {
    return result.summary;
  }

  if (Array.isArray(result.emails)) {
    if (result.emails.length === 0) {
      return "No matching emails found.";
    }

    return result.emails
      .slice(0, 5)
      .map((email: any, index: number) => {
        return `${index + 1}. ${email.subject || "No subject"}\nFrom: ${
          email.from || "Unknown sender"
        }\n${email.snippet || ""}`;
      })
      .join("\n\n");
  }

  if (Array.isArray(result.events)) {
    if (result.events.length === 0) {
      return "No calendar events found.";
    }

    return result.events
      .slice(0, 5)
      .map((event: any, index: number) => {
        return `${index + 1}. ${event.summary || event.title || "Untitled"}\n${
          event.start || event.startTime || ""
        }`;
      })
      .join("\n\n");
  }

  return JSON.stringify(result, null, 2);
}

export async function handleChatMessage(
  message: string,
  conversationId?: string | null
): Promise<ChatServiceResponse> {
  const userEmail = getCurrentUserEmail();

  const classification = classifyIntent(message);
  const tool = getToolForIntent(classification.intent);

  const agent = createAgentTrace(
    classification.intent,
    classification.confidence,
    tool
  );

  let reply = "";

  if (tool) {
    const toolResult = await runExternalTool(tool, message);
    reply = formatToolResult(tool, toolResult);
  } else {
    const llmResult = await generateAIResponse({
      message,
      intent: classification.intent,
      userEmail,
    });

    reply = llmResult.text;

    agent.steps.splice(
      3,
      0,
      llmResult.usedFallback
        ? `LLM provider fallback used: ${llmResult.provider}`
        : `LLM provider used: ${llmResult.provider}`
    );
  }

  const savedConversation = await saveChatTurn({
    userEmail,
    conversationId,
    userMessage: message,
    assistantMessage: reply,
    agent,
  });

  return {
    success: true,
    reply,
    conversationId: savedConversation?.id || null,
    agent,
    userEmail,
  };
}

export const processChatMessage = handleChatMessage;
export const chatService = handleChatMessage;
export const handleChat = handleChatMessage;

export default handleChatMessage;