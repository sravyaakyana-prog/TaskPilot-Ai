import { getGmailClient } from "./gmail.client";

type EmailCategory =
  | "Career / Jobs"
  | "Learning"
  | "Promotions"
  | "Personal / Other";

type EmailPriority = "High" | "Medium" | "Low";

type GmailEmail = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  category: EmailCategory;
  priority: EmailPriority;
};

function extractHeader(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
) {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value || "Unknown"
  );
}

function cleanText(text: string) {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyEmail(from: string, subject: string, snippet: string): {
  category: EmailCategory;
  priority: EmailPriority;
} {
  const text = `${from} ${subject} ${snippet}`.toLowerCase();

  if (
    text.includes("intern") ||
    text.includes("job") ||
    text.includes("career") ||
    text.includes("hiring") ||
    text.includes("recruit") ||
    text.includes("application") ||
    text.includes("interview")
  ) {
    return {
      category: "Career / Jobs",
      priority: "High",
    };
  }

  if (
    text.includes("course") ||
    text.includes("coursera") ||
    text.includes("medium") ||
    text.includes("learn") ||
    text.includes("tutorial") ||
    text.includes("recommendation")
  ) {
    return {
      category: "Learning",
      priority: "Medium",
    };
  }

  if (
    text.includes("launch") ||
    text.includes("offer") ||
    text.includes("discount") ||
    text.includes("sale") ||
    text.includes("product") ||
    text.includes("support")
  ) {
    return {
      category: "Promotions",
      priority: "Low",
    };
  }

  return {
    category: "Personal / Other",
    priority: "Medium",
  };
}

function groupEmails(emails: GmailEmail[]) {
  return emails.reduce<Record<EmailCategory, GmailEmail[]>>(
    (groups, email) => {
      groups[email.category].push(email);
      return groups;
    },
    {
      "Career / Jobs": [],
      Learning: [],
      Promotions: [],
      "Personal / Other": [],
    }
  );
}

function formatEmail(email: GmailEmail, index: number) {
  return `${index + 1}. ${email.subject}
   From: ${email.from}
   Priority: ${email.priority}
   Preview: ${email.snippet}`;
}

export async function summarizeUnreadEmails(): Promise<string> {
  const gmail = getGmailClient();

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 8,
  });

  const messages = listResponse.data.messages || [];

  if (messages.length === 0) {
    return `📬 Gmail Summary

You have no unread emails right now.

Suggested action:
No action needed. Your inbox is clear.`;
  }

  const emails: GmailEmail[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject"],
    });

    const headers = fullMessage.data.payload?.headers;

    const from = cleanText(extractHeader(headers, "From"));
    const subject = cleanText(extractHeader(headers, "Subject"));
    const snippet = cleanText(fullMessage.data.snippet || "");

    const classification = classifyEmail(from, subject, snippet);

    emails.push({
      id: message.id,
      from,
      subject,
      snippet,
      category: classification.category,
      priority: classification.priority,
    });
  }

  const grouped = groupEmails(emails);

  let summary = `📬 Gmail Inbox Summary

I found ${emails.length} unread email(s).

`;

  const categoryOrder: EmailCategory[] = [
    "Career / Jobs",
    "Learning",
    "Promotions",
    "Personal / Other",
  ];

  for (const category of categoryOrder) {
    const items = grouped[category];

    if (items.length === 0) continue;

    summary += `\n${category}\n`;

    items.forEach((email, index) => {
      summary += `${formatEmail(email, index)}\n\n`;
    });
  }

  const highPriorityCount = emails.filter((email) => email.priority === "High").length;
  const promotionCount = grouped["Promotions"].length;

  summary += `Suggested Actions:
- Review ${highPriorityCount} high-priority career/job related email(s) first.
- Archive or ignore ${promotionCount} promotional/low-priority email(s) if not useful.
- Reply only after checking the sender and context carefully.`;

  return summary.trim();
}