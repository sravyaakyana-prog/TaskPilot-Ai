import { AgentPlan } from "../agents/planner";
import { createCalendarEvent } from "../tools/calendar/calendar.create";
import { queryCalendarEvents } from "../tools/calendar/calendar.query";
import { searchDocuments } from "../tools/document/document.search";
import { generateEmailDraft } from "../tools/gmail/gmail.draft";
import { searchEmails } from "../tools/gmail/gmail.search";
import { summarizeUnreadEmails } from "../tools/gmail/gmail.summary";

export async function executeTool(
  plan: AgentPlan,
  message: string
): Promise<string | null> {
  if (!plan.toolRequired || !plan.toolName) {
    return null;
  }

  switch (plan.toolName) {
    case "gmail.summary":
      return await summarizeUnreadEmails();

    case "gmail.search":
      return await searchEmails(message);

    case "gmail.draft":
      return await generateEmailDraft(message);

    case "calendar.query":
      return await queryCalendarEvents(message);

    case "calendar.create":
      return await createCalendarEvent(message);

    case "document.search":
      return await searchDocuments(message);

    case "task.planner":
      return `Task planner tool is planned. User request: "${message}"`;

    default:
      return `Tool selected: ${plan.toolName}. Tool execution is not implemented yet.`;
  }
}