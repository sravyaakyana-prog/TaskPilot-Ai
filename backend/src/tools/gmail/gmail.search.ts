import { getGmailClient } from "./gmail.client";

type GmailSearchResult = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
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

function buildGmailQuery(message: string) {
  const text = message.toLowerCase();

  const queryParts: string[] = [];

  if (text.includes("unread")) {
    queryParts.push("is:unread");
  }

  if (text.includes("important")) {
    queryParts.push("is:important");
  }

  const fromMatch = text.match(/from\s+([a-z0-9@._-]+)/i);

  if (fromMatch?.[1]) {
    queryParts.push(`from:${fromMatch[1]}`);
  }

  let keyword = text
    .replace(/find/g, "")
    .replace(/search/g, "")
    .replace(/show/g, "")
    .replace(/list/g, "")
    .replace(/emails/g, "")
    .replace(/email/g, "")
    .replace(/mail/g, "")
    .replace(/inbox/g, "")
    .replace(/about/g, "")
    .replace(/from\s+[a-z0-9@._-]+/i, "")
    .replace(/unread/g, "")
    .replace(/important/g, "")
    .trim();

  if (keyword.length > 0) {
    queryParts.push(keyword);
  }

  if (queryParts.length === 0) {
    return "newer_than:30d";
  }

  return queryParts.join(" ");
}

export async function searchEmails(message: string): Promise<string> {
  const gmail = getGmailClient();
  const query = buildGmailQuery(message);

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 8,
  });

  const messages = listResponse.data.messages || [];

  if (messages.length === 0) {
    return `🔎 Gmail Search

No emails found for query:

${query}

Try searching with a simpler keyword, sender name, or topic.`;
  }

  const results: GmailSearchResult[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject"],
    });

    const headers = fullMessage.data.payload?.headers;

    results.push({
      id: message.id,
      from: cleanText(extractHeader(headers, "From")),
      subject: cleanText(extractHeader(headers, "Subject")),
      snippet: cleanText(fullMessage.data.snippet || ""),
    });
  }

  let response = `🔎 Gmail Search Results

Query used:
${query}

I found ${results.length} matching email(s).

`;

  results.forEach((email, index) => {
    response += `${index + 1}. ${email.subject}
   From: ${email.from}
   Preview: ${email.snippet}

`;
  });

  response += `Suggested Actions:
- Open the most relevant email before replying.
- Use a more specific sender or keyword if there are too many results.
- Ask TaskPilot to draft a reply after selecting an email.`;

  return response.trim();
}