import { calendar_v3 } from "googleapis";
import { getCalendarClient } from "./calendar.client";

type CalendarRange = {
  label: string;
  timeMin: Date;
  timeMax: Date;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getCalendarRange(message: string): CalendarRange {
  const text = message.toLowerCase();
  const now = new Date();

  if (text.includes("tomorrow")) {
    const tomorrow = addDays(now, 1);

    return {
      label: "tomorrow",
      timeMin: startOfDay(tomorrow),
      timeMax: endOfDay(tomorrow),
    };
  }

  if (text.includes("week")) {
    return {
      label: "this week",
      timeMin: startOfDay(now),
      timeMax: endOfDay(addDays(now, 7)),
    };
  }

  return {
    label: "today",
    timeMin: startOfDay(now),
    timeMax: endOfDay(now),
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "Time not specified";

  const date = new Date(value);

  return date.toLocaleString("en-IN", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function formatEvent(event: calendar_v3.Schema$Event, index: number) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  return `${index + 1}. ${event.summary || "Untitled Event"}
   Time: ${formatDateTime(start)} - ${formatDateTime(end)}
   Location: ${event.location || "No location"}
   Description: ${event.description ? event.description.slice(0, 180) : "No description"}`;
}

export async function queryCalendarEvents(message: string): Promise<string> {
  const calendar = getCalendarClient();
  const range = getCalendarRange(message);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: range.timeMin.toISOString(),
    timeMax: range.timeMax.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = response.data.items || [];

  if (events.length === 0) {
    return `📅 Calendar Summary

I found no events on your calendar for ${range.label}.

Suggested action:
You are free during this period.`;
  }

  let summary = `📅 Calendar Summary

I found ${events.length} event(s) for ${range.label}.

`;

  events.forEach((event, index) => {
    summary += `${formatEvent(event, index)}\n\n`;
  });

  summary += `Suggested Actions:
- Review meetings with fixed times first.
- Prepare notes for important calls.
- Ask TaskPilot to create a new calendar event if needed.`;

  return summary.trim();
}