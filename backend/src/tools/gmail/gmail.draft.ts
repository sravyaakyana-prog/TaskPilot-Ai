import { getGmailClient } from "./gmail.client";

type EmailDraft = {
  to: string;
  subject: string;
  body: string;
  note: string;
  canCreateRealDraft: boolean;
};

function cleanMessage(message: string) {
  return message.replace(/\s+/g, " ").trim();
}

function extractRecipient(message: string) {
  const emailMatch = message.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );

  if (emailMatch?.[0]) {
    return emailMatch[0];
  }

  return "[Recipient Email Required]";
}

function hasValidEmail(value: string) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

function detectDraftType(message: string) {
  const text = message.toLowerCase();

  if (
    text.includes("follow up") ||
    text.includes("follow-up") ||
    text.includes("status") ||
    text.includes("update")
  ) {
    return "follow_up";
  }

  if (
    text.includes("internship") ||
    text.includes("job") ||
    text.includes("application") ||
    text.includes("hiring")
  ) {
    return "job_application";
  }

  if (
    text.includes("thank") ||
    text.includes("thanks") ||
    text.includes("grateful")
  ) {
    return "thank_you";
  }

  if (
    text.includes("meeting") ||
    text.includes("schedule") ||
    text.includes("call")
  ) {
    return "meeting";
  }

  return "general";
}

function buildDraft(message: string): EmailDraft {
  const cleaned = cleanMessage(message);
  const recipient = extractRecipient(cleaned);
  const draftType = detectDraftType(cleaned);
  const canCreateRealDraft = hasValidEmail(recipient);

  if (draftType === "follow_up") {
    return {
      to: recipient,
      subject: "Follow-up regarding my application",
      body: `Dear ${canCreateRealDraft ? "Hiring Team" : "[Recipient Name]"},

I hope you are doing well.

I wanted to follow up regarding my application and check if there are any updates. I am very interested in the opportunity and would be grateful for the chance to contribute and learn.

Please let me know if any additional information is required from my side.

Thank you for your time and consideration.

Best regards,
Sravya`,
      note: "This is a polite follow-up draft suitable for internship/job applications.",
      canCreateRealDraft,
    };
  }

  if (draftType === "job_application") {
    return {
      to: recipient,
      subject: "Application for Internship Opportunity",
      body: `Dear ${canCreateRealDraft ? "Hiring Team" : "[Hiring Team]"},

I hope you are doing well.

I am writing to express my interest in the internship opportunity. I am currently building strong projects in full-stack development and AI, including intelligent search systems and AI productivity agents.

I would be grateful for the opportunity to contribute, learn, and grow with your team.

Please let me know if you need any additional information from my side.

Thank you for your time and consideration.

Best regards,
Sravya`,
      note: "This draft is suitable for applying to internship or entry-level opportunities.",
      canCreateRealDraft,
    };
  }

  if (draftType === "thank_you") {
    return {
      to: recipient,
      subject: "Thank You",
      body: `Dear ${canCreateRealDraft ? "Recipient" : "[Recipient Name]"},

I hope you are doing well.

Thank you for your time and support. I truly appreciate your guidance and the opportunity to connect.

I look forward to staying in touch.

Best regards,
Sravya`,
      note: "This is a short professional thank-you email.",
      canCreateRealDraft,
    };
  }

  if (draftType === "meeting") {
    return {
      to: recipient,
      subject: "Meeting Request",
      body: `Dear ${canCreateRealDraft ? "Recipient" : "[Recipient Name]"},

I hope you are doing well.

I wanted to check if we could schedule a short meeting to discuss this further. Please let me know a convenient time for you.

Thank you.

Best regards,
Sravya`,
      note: "This draft is suitable for requesting a meeting or discussion.",
      canCreateRealDraft,
    };
  }

  return {
    to: recipient,
    subject: "Regarding Your Message",
    body: `Dear ${canCreateRealDraft ? "Recipient" : "[Recipient Name]"},

I hope you are doing well.

I am writing regarding the following request:

"${cleaned}"

Please let me know if you need any further details from my side.

Thank you.

Best regards,
Sravya`,
    note: "This is a general professional email draft.",
    canCreateRealDraft,
  };
}

function encodeBase64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createRawEmail(draft: EmailDraft) {
  const emailLines = [
    `To: ${draft.to}`,
    `Subject: ${draft.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    draft.body,
  ];

  return encodeBase64Url(emailLines.join("\r\n"));
}

export async function generateEmailDraft(message: string): Promise<string> {
  const draft = buildDraft(message);

  if (!draft.canCreateRealDraft) {
    return `✍️ Gmail Draft Assistant

Status:
Draft preview generated inside TaskPilot.

Real Gmail draft was not created because no valid recipient email was found.

To:
${draft.to}

Subject:
${draft.subject}

Body:
${draft.body}

Note:
${draft.note}

Next Step:
Ask again with a recipient email.

Example:
Write an email to recruiter@example.com about internship opportunity`;
  }

  const gmail = getGmailClient();
  const rawEmail = createRawEmail(draft);

  const createdDraft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: rawEmail,
      },
    },
  });

  return `✍️ Gmail Draft Assistant

Status:
Real Gmail draft created successfully.

Draft ID:
${createdDraft.data.id || "Created"}

To:
${draft.to}

Subject:
${draft.subject}

Body:
${draft.body}

Note:
${draft.note}

Safety:
This email has only been saved as a Gmail draft. It has not been sent. Open Gmail Drafts to review and send manually.`;
}