import { getCalendarClient } from "./calendar.client";

const TIME_ZONE = "Asia/Kolkata";

type ParsedEvent = {
  title: string;
  start: Date | null;
  end: Date | null;
  durationMinutes: number;
  canCreate: boolean;
  reason?: string;
};

function cleanMessage(message: string) {
  return message.replace(/\s+/g, " ").trim();
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseDate(message: string): Date | null {
  const text = message.toLowerCase();
  const now = new Date();

  if (text.includes("tomorrow")) {
    return addDays(now, 1);
  }

  if (text.includes("today")) {
    return now;
  }

  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);

  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = Number(dateMatch[3]);

    return new Date(year, month, day);
  }

  return null;
}

function parseTime(message: string): { hour: number; minute: number } | null {
  const text = message.toLowerCase();

  const timeMatch = text.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  const period = timeMatch[3].toLowerCase();

  if (period === "pm" && hour !== 12) {
    hour += 12;
  }

  if (period === "am" && hour === 12) {
    hour = 0;
  }

  return {
    hour,
    minute,
  };
}

function parseDuration(message: string) {
  const text = message.toLowerCase();

  const durationMatch = text.match(/\bfor\s+(\d+)\s*(minutes|minute|mins|min|hours|hour|hrs|hr)\b/);

  if (!durationMatch) return 30;

  const value = Number(durationMatch[1]);
  const unit = durationMatch[2];

  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return value * 60;
  }

  return value;
}

function buildTitle(message: string) {
  let title = cleanMessage(message)
    .replace(/\b(schedule|create|book|add|set up)\b/gi, "")
    .replace(/\b(today|tomorrow)\b/gi, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/gi, "")
    .replace(/\bat\s*\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, "")
    .replace(/\bfor\s+\d+\s*(minutes|minute|mins|min|hours|hour|hrs|hr)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    title = "Meeting";
  }

  title = title.replace(/^a\s+/i, "");

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function parseCalendarEvent(message: string): ParsedEvent {
  const date = parseDate(message);
  const time = parseTime(message);
  const durationMinutes = parseDuration(message);
  const title = buildTitle(message);

  if (!date) {
    return {
      title,
      start: null,
      end: null,
      durationMinutes,
      canCreate: false,
      reason: "No clear date found. Please mention today, tomorrow, or a date like 06/07/2026.",
    };
  }

  if (!time) {
    return {
      title,
      start: null,
      end: null,
      durationMinutes,
      canCreate: false,
      reason: "No clear time found. Please mention a time like 5 PM or 6:30 PM.",
    };
  }

  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hour,
    time.minute,
    0,
    0
  );

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return {
    title,
    start,
    end,
    durationMinutes,
    canCreate: true,
  };
}

function formatDateTime(date: Date | null) {
  if (!date) return "Not available";

  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function createCalendarEvent(message: string): Promise<string> {
  const parsed = parseCalendarEvent(message);

  if (!parsed.canCreate || !parsed.start || !parsed.end) {
    return `📅 Calendar Event Assistant

Status:
Event was not created because details are incomplete.

Title:
${parsed.title}

Reason:
${parsed.reason}

Example:
Schedule a meeting tomorrow at 5 PM

Another example:
Book interview prep tomorrow at 6:30 PM for 1 hour`;
  }

  const calendar = getCalendarClient();

  const eventResponse = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: parsed.title,
      description: "Created by TaskPilot AI. Please review details if needed.",
      start: {
        dateTime: parsed.start.toISOString(),
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: parsed.end.toISOString(),
        timeZone: TIME_ZONE,
      },
    },
  });

  return `📅 Calendar Event Created

Status:
Real Google Calendar event created successfully.

Title:
${parsed.title}

Time:
${formatDateTime(parsed.start)} - ${formatDateTime(parsed.end)}

Duration:
${parsed.durationMinutes} minutes

Calendar Link:
${eventResponse.data.htmlLink || "Created in Google Calendar"}

Safety:
The event was added to your calendar. Open Google Calendar to review or edit it.`;
}