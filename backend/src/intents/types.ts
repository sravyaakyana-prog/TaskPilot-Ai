export type IntentType =
  | "GENERAL_CHAT"
  | "EMAIL_SUMMARY"
  | "EMAIL_SEARCH"
  | "EMAIL_DRAFT"
  | "CALENDAR_QUERY"
  | "CALENDAR_CREATE"
  | "DOCUMENT_QA"
  | "TASK_PLANNING"
  | "UNKNOWN";

export type IntentResult = {
  intent: IntentType;
  confidence: number;
  reason: string;
};