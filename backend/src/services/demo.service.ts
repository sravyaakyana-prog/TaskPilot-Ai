export function isDemoModeEnabled() {
  return String(process.env.DEMO_MODE_ENABLED || "false").toLowerCase() === "true";
}

export function isDemoRequest(message: string) {
  const text = message.toLowerCase();

  return (
    text.includes("demo") ||
    text.includes("sample") ||
    text.includes("try taskpilot") ||
    text.includes("show features") ||
    text.includes("show what taskpilot can do")
  );
}

export function getDemoOverview() {
  return `✨ TaskPilot AI Demo Mode

Here is what TaskPilot can do:

1. Gmail Assistant
- Summarize unread emails
- Search emails by topic or sender
- Draft professional email replies

2. Calendar Assistant
- Show today's meetings
- Find upcoming events
- Create new calendar events

3. Document Intelligence
- Upload PDF/TXT files
- Summarize documents
- Ask questions from uploaded files using RAG

4. AI Agent Workflow
- Classifies user intent
- Selects the right tool
- Executes Gmail, Calendar, or Document tools
- Shows Agent Trace for transparency

Try asking:
- Summarize my unread emails
- What meetings do I have today?
- Summarize this document
- Draft an email for an AI/ML internship`;
}

export function getDemoToolResult(tool: string, message: string) {
  if (tool === "gmail.summary") {
    return {
      success: true,
      demo: true,
      message: `📩 Demo Gmail Summary

You have 4 important unread emails:

1. Internship Opportunity — AI/ML Intern
A recruiter shared an opening for an AI/ML internship requiring Python, ML, NLP, and full-stack project experience.

2. GitHub Security Alert
One dependency in a project repository needs review.

3. Calendar Reminder
You have a project review meeting scheduled today at 5:00 PM.

4. Course Update
A new module on Machine Learning deployment is available.

Suggested Action:
Reply to the internship email first and review the GitHub alert after that.`,
    };
  }

  if (tool === "gmail.search") {
    return {
      success: true,
      demo: true,
      emails: [
        {
          subject: "AI/ML Internship Opportunity",
          from: "recruiter@example.com",
          snippet:
            "We are looking for an AI/ML intern with experience in Python, NLP, embeddings, and full-stack AI applications.",
        },
        {
          subject: "Internship Application Follow-up",
          from: "hr@example.com",
          snippet:
            "Thank you for applying. Please share your resume and project portfolio links.",
        },
      ],
    };
  }

  if (tool === "gmail.draft") {
    return {
      success: true,
      demo: true,
      message: `📩 Demo Gmail Draft Created

Subject:
Application for AI/ML Internship

Body:
Dear Hiring Team,

I am interested in the AI/ML Internship opportunity. I have hands-on experience building full-stack AI applications using Machine Learning, NLP, document RAG, Google APIs, MongoDB, Next.js, Express.js, and TypeScript.

I have built projects such as TaskPilot AI and SemanticRank AI, which demonstrate practical AI engineering, API integration, and deployment-ready full-stack development.

Thank you for your time and consideration.

Best regards,
Sravya Akyana

Note:
This is a demo draft. Connect Gmail to create real drafts.`,
    };
  }

  if (tool === "calendar.query") {
    return {
      success: true,
      demo: true,
      events: [
        {
          title: "AI Project Review",
          start: "Today, 5:00 PM",
        },
        {
          title: "Resume Update Session",
          start: "Tomorrow, 10:00 AM",
        },
        {
          title: "Internship Application Follow-up",
          start: "Tomorrow, 6:30 PM",
        },
      ],
    };
  }

  if (tool === "calendar.create") {
    return {
      success: true,
      demo: true,
      message: `📅 Demo Calendar Event Created

Title:
AI/ML Internship Preparation

Time:
Tomorrow, 6:00 PM - 7:00 PM

Description:
Review resume, GitHub projects, deployment links, and prepare answers for AI/ML internship interviews.

Note:
This is a demo event. Connect Google Calendar to create real events.`,
    };
  }

  if (tool === "document.search") {
    return {
      success: true,
      demo: true,
      answer: `Demo Document Answer

TaskPilot AI is a full-stack AI productivity assistant that combines Gmail, Calendar, document RAG, MongoDB persistence, and Gemini-powered responses.

Key points:
- Uses intent classification to understand user requests
- Routes requests to Gmail, Calendar, or Document tools
- Stores chats, documents, users, and Google sessions in MongoDB
- Supports PDF/TXT upload and grounded document answers
- Shows Agent Trace for transparency

Sources:
- Demo Document, chunk 1

RAG Mode:
Demo document retrieval + generated answer.`,
      results: [
        {
          fileName: "TaskPilot_AI_Demo.pdf",
          chunkIndex: 0,
        },
      ],
    };
  }

  return {
    success: true,
    demo: true,
    message: getDemoOverview(),
  };
}