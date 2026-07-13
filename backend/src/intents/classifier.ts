import { IntentClassification } from "./types";

export function classifyIntent(message: string): IntentClassification {
  const text = message.toLowerCase().trim();

  if (
    text.includes("summarize my unread") ||
    text.includes("summarise my unread") ||
    text.includes("unread emails") ||
    text.includes("summarize inbox") ||
    text.includes("summarise inbox") ||
    text.includes("gmail summary") ||
    text.includes("email summary")
  ) {
    return {
      intent: "EMAIL_SUMMARY",
      confidence: 0.92,
      reason: "User wants Gmail or unread email summary.",
    };
  }

  if (
    text.includes("find emails") ||
    text.includes("search emails") ||
    text.includes("find email") ||
    text.includes("search gmail") ||
    text.includes("emails about") ||
    text.includes("email about") ||
    text.includes("from gmail") ||
    text.includes("from coursera") ||
    text.includes("from linkedin")
  ) {
    return {
      intent: "EMAIL_SEARCH",
      confidence: 0.9,
      reason: "User wants to search Gmail messages.",
    };
  }

  if (
    text.includes("draft email") ||
    text.includes("write an email") ||
    text.includes("create email") ||
    text.includes("compose email") ||
    text.includes("draft a mail") ||
    text.includes("write a mail")
  ) {
    return {
      intent: "EMAIL_DRAFT",
      confidence: 0.9,
      reason: "User wants to draft an email.",
    };
  }

  if (
    text.includes("schedule a meeting") ||
    text.includes("create meeting") ||
    text.includes("book meeting") ||
    text.includes("add meeting") ||
    text.includes("set up meeting") ||
    text.includes("create calendar event") ||
    text.includes("add calendar event")
  ) {
    return {
      intent: "CALENDAR_CREATE",
      confidence: 0.9,
      reason: "User wants to create a calendar event.",
    };
  }

  if (
    text.includes("calendar") ||
    text.includes("meetings today") ||
    text.includes("meeting today") ||
    text.includes("meetings tomorrow") ||
    text.includes("show my schedule") ||
    text.includes("what meetings") ||
    text.includes("my schedule")
  ) {
    return {
      intent: "CALENDAR_QUERY",
      confidence: 0.88,
      reason: "User wants to query calendar events.",
    };
  }

  if (
    text.includes("pdf") ||
    text.includes("document") ||
    text.includes("file") ||
    text.includes("rag") ||
    text.includes("uploaded") ||
    text.includes("according to") ||
    text.includes("summarize this") ||
    text.includes("summarise this") ||
    text.includes("summarize it") ||
    text.includes("summarise it") ||
    text.includes("summarize the uploaded") ||
    text.includes("summarise the uploaded") ||
    text.includes("what is it about") ||
    text.includes("what is this about") ||
    text.includes("what does it say") ||
    text.includes("what does this say") ||
    text.includes("explain it") ||
    text.includes("explain this") ||
    text.includes("key points") ||
    text.includes("main points") ||
    text.includes("important points") ||
    text.includes("main topics") ||
    text.includes("important topics") ||
    text.includes("key takeaways") ||
    text.includes("takeaways") ||
    text.includes("highlights") ||
    text.includes("important concepts") ||
    text.includes("main concepts") ||
    text.includes("short notes") ||
    text.includes("notes from it") ||
    text.includes("questions from it") ||
    text.includes("make notes") ||
    text.includes("give notes") ||
    text.includes("explain the key") ||
    text.includes("what are the key") ||
    text.includes("what are main") ||
    text.includes("what are important")
  ) {
    return {
      intent: "DOCUMENT_QA",
      confidence: 0.9,
      reason: "User is asking about uploaded documents or document RAG.",
    };
  }

  if (
    text.includes("plan my day") ||
    text.includes("daily plan") ||
    text.includes("todo") ||
    text.includes("task plan") ||
    text.includes("prioritize")
  ) {
    return {
      intent: "TASK_PLANNING",
      confidence: 0.82,
      reason: "User wants task planning assistance.",
    };
  }

  return {
    intent: "GENERAL_CHAT",
    confidence: 0.7,
    reason: "General conversation or unsupported request.",
  };
}