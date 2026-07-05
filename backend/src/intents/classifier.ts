import { IntentResult } from "./types";

export function classifyIntent(message: string): IntentResult {
  const text = message.toLowerCase();

  if (
    text.includes("summarize") &&
    (text.includes("email") || text.includes("inbox") || text.includes("unread"))
  ) {
    return {
      intent: "EMAIL_SUMMARY",
      confidence: 0.92,
      reason: "User wants email/inbox summarization.",
    };
  }

  if (
    (text.includes("find") ||
      text.includes("search") ||
      text.includes("show") ||
      text.includes("list")) &&
    (text.includes("email") ||
      text.includes("emails") ||
      text.includes("mail") ||
      text.includes("inbox"))
  ) {
    return {
      intent: "EMAIL_SEARCH",
      confidence: 0.9,
      reason: "User wants to search emails by sender, topic, or keyword.",
    };
  }

  if (
    (text.includes("draft") || text.includes("write") || text.includes("reply")) &&
    text.includes("email")
  ) {
    return {
      intent: "EMAIL_DRAFT",
      confidence: 0.9,
      reason: "User wants help drafting an email.",
    };
  }

  const calendarRelated =
    text.includes("meeting") ||
    text.includes("calendar") ||
    text.includes("schedule") ||
    text.includes("call") ||
    text.includes("event");

  const calendarQuery =
    text.includes("what") ||
    text.includes("show") ||
    text.includes("list") ||
    text.includes("do i have") ||
    text.includes("my calendar") ||
    text.includes("my schedule");

  const calendarCreate =
    text.includes("create") ||
    text.includes("book") ||
    text.includes("add") ||
    text.includes("set up") ||
    (text.startsWith("schedule") && !calendarQuery);

  if (calendarRelated) {
    if (calendarCreate) {
      return {
        intent: "CALENDAR_CREATE",
        confidence: 0.9,
        reason: "User wants to create a calendar event.",
      };
    }

    return {
      intent: "CALENDAR_QUERY",
      confidence: 0.86,
      reason: "User is asking about calendar or meetings.",
    };
  }

  if (
    text.includes("pdf") ||
    text.includes("document") ||
    text.includes("file") ||
    text.includes("rag")
  ) {
    return {
      intent: "DOCUMENT_QA",
      confidence: 0.88,
      reason: "User is asking about documents or RAG.",
    };
  }

  if (
    text.includes("plan") ||
    text.includes("tasks") ||
    text.includes("todo") ||
    text.includes("day")
  ) {
    return {
      intent: "TASK_PLANNING",
      confidence: 0.84,
      reason: "User wants task planning or day planning.",
    };
  }

  if (text.trim().length > 0) {
    return {
      intent: "GENERAL_CHAT",
      confidence: 0.75,
      reason: "No specific tool intent detected.",
    };
  }

  return {
    intent: "UNKNOWN",
    confidence: 0,
    reason: "Empty or unclear message.",
  };
}