"use client";

import { useEffect, useRef, useState } from "react";

type AgentTrace = {
  intent: string;
  confidence: number;
  tool: string | null;
  toolRequired: boolean;
  steps: string[];
};

type GoogleStatus = {
  connected: boolean;
  user: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
};

type DocumentItem = {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalChunks: number;
};

type HistorySummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  } | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: AgentTrace;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MAX_DOCUMENT_SIZE_MB = 12;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

const quickActions = [
  {
    icon: "📩",
    title: "Summarize Inbox",
    description: "Unread Gmail summary",
    prompt: "Summarize my unread emails today",
  },
  {
    icon: "🔎",
    title: "Find Internships",
    description: "Search Gmail quickly",
    prompt: "Find emails about internships",
  },
  {
    icon: "📅",
    title: "Today Calendar",
    description: "Check your schedule",
    prompt: "What meetings do I have today?",
  },
  {
    icon: "📄",
    title: "Summarize Doc",
    description: "Ask uploaded files",
    prompt: "What is this document about?",
  },
  {
    icon: "✨",
    title: "Try Demo",
    description: "No login needed",
    prompt: "Run demo mode and show what TaskPilot AI can do",
  },
];

function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSavedTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name?: string, email?: string) {
  const source = name || email || "User";

  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFirstName(name?: string) {
  if (!name) return "there";
  return name.split(" ")[0];
}

function validateDocumentFile(file: File) {
  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith(".pdf");
  const isTxt = fileName.endsWith(".txt");

  if (!isPdf && !isTxt) {
    return "Unsupported file type. Please upload only a PDF or TXT file.";
  }

  if (file.size === 0) {
    return "The uploaded file is empty. Please upload a readable PDF or TXT file.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `File is too large. Please upload a PDF or TXT file under ${MAX_DOCUMENT_SIZE_MB}MB.`;
  }

  return null;
}

export default function Home() {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "TaskPilot is ready. I can summarize Gmail, search emails, create Gmail drafts, read your calendar, create calendar events, and answer questions from uploaded documents.",
      time: "Now",
    },
  ]);

  const [latestAgent, setLatestAgent] = useState<AgentTrace | null>(null);

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({
    connected: false,
    user: null,
  });

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const displayName =
    googleStatus.connected && googleStatus.user?.name
      ? getFirstName(googleStatus.user.name)
      : "there";

  const fullName =
    googleStatus.user?.name || googleStatus.user?.email || "Guest User";

  const userEmail = googleStatus.user?.email || "Connect Google account";

  const userInitials = getInitials(
    googleStatus.user?.name,
    googleStatus.user?.email
  );

  const connectGoogle = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const disconnectGoogle = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, {
        method: "POST",
      });

      const data = await res.json();

      setGoogleStatus({
        connected: false,
        user: null,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.message ||
            "Google account disconnected. Gmail and Calendar tools will use demo mode until you connect again.",
          time: timeNow(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Could not disconnect Google account. Please try again.",
          time: timeNow(),
        },
      ]);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      const data = await res.json();

      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch {
      setDocuments([]);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.conversations || []);
      }
    } catch {
      setHistory([]);
    }
  };

  const loadConversation = async (conversationId: string) => {
    setLoadingHistory(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/history/${conversationId}`);
      const data = await res.json();

      if (data.success && data.conversation) {
        setCurrentConversationId(data.conversation.id);

        setMessages(
          data.conversation.messages.map((message: any) => ({
            role: message.role,
            content: message.content,
            time: formatSavedTime(message.createdAt),
            agent: message.agent,
          }))
        );

        const lastAssistantMessage = [...data.conversation.messages]
          .reverse()
          .find(
            (message: any) => message.role === "assistant" && message.agent
          );

        setLatestAgent(lastAssistantMessage?.agent || null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Could not load this conversation.",
          time: timeNow(),
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setLatestAgent(null);
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started. Ask TaskPilot about Gmail, Calendar, documents, or automation.",
        time: "Now",
      },
    ]);
  };

  const clearHistory = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/history`, {
        method: "DELETE",
      });

      setHistory([]);
      setCurrentConversationId(null);
      startNewChat();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Could not clear chat history.",
          time: timeNow(),
        },
      ]);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || uploadingDocument) return;

    const validationError = validateDocumentFile(selectedFile);

    if (validationError) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Document upload failed.

${validationError}`,
          time: timeNow(),
        },
      ]);

      return;
    }

    setUploadingDocument(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: "Server returned an invalid response. Please try again.",
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.success
            ? `📄 Document uploaded successfully.

File: ${data.document.fileName}
Chunks: ${data.document.totalChunks}

You can now ask questions about this document.`
            : `⚠️ Document upload failed.

${data.error || "Please upload a readable PDF or TXT file."}`,
          time: timeNow(),
        },
      ]);

      if (data.success) {
        setSelectedFile(null);
        await fetchDocuments();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Document upload failed. Please check that the backend is running and try again.",
          time: timeNow(),
        },
      ]);
    } finally {
      setUploadingDocument(false);
    }
  };

  const uploadComposerDocument = async (file: File) => {
    if (uploadingDocument) return;

    const validationError = validateDocumentFile(file);

    if (validationError) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Document upload failed.

${validationError}`,
          time: timeNow(),
        },
      ]);

      return;
    }

    setUploadingDocument(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: "Server returned an invalid response. Please try again.",
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.success
            ? `📄 Document uploaded successfully.

File: ${data.document.fileName}
Chunks: ${data.document.totalChunks}

You can now ask questions about this document.`
            : `⚠️ Document upload failed.

${data.error || "Please upload a readable PDF or TXT file."}`,
          time: timeNow(),
        },
      ]);

      if (data.success) {
        await fetchDocuments();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Document upload failed. Please check that the backend is running and try again.",
          time: timeNow(),
        },
      ]);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleImageComingSoon = () => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "🖼️ Image upload is coming soon. For now, TaskPilot supports PDF and TXT document upload.",
        time: timeNow(),
      },
    ]);
  };

  const sendMessage = async (custom?: string) => {
    const text = custom || input;
    if (!text.trim() || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        time: timeNow(),
      },
    ]);

    setInput("");
    setLoading(true);
    setStep(0);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          conversationId: currentConversationId,
        }),
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: "Server returned an invalid response.",
      }));

      if (data.agent) {
        setLatestAgent(data.agent);
      }

      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Something went wrong.",
          time: timeNow(),
          agent: data.agent,
        },
      ]);

      await fetchHistory();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Backend is not reachable. Start the backend on port 5000.",
          time: timeNow(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkGoogleStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google/status`);
        const data = await res.json();

        setGoogleStatus({
          connected: Boolean(data.connected),
          user: data.user || null,
        });
      } catch {
        setGoogleStatus({
          connected: false,
          user: null,
        });
      }
    }

    checkGoogleStatus();
    fetchDocuments();
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 650);

    return () => clearInterval(timer);
  }, [loading]);

  return (
    <main className="h-screen overflow-hidden bg-[#060A14] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.28),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(79,70,229,0.12),transparent_35%)]" />

      <div className="relative grid h-screen grid-cols-[270px_1fr_340px]">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#070B16]/80 backdrop-blur-2xl">
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-lg shadow-lg shadow-cyan-500/10">
                ✦
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight">
                  TaskPilot AI
                </h1>
                <p className="text-xs text-slate-400">
                  AI Productivity Workspace
                </p>
              </div>
            </div>

            <button
              onClick={startNewChat}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.01]"
            >
              + New Chat
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Recent Chats</p>

                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs font-semibold text-red-300 hover:text-red-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-4 max-h-[540px] space-y-2 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="rounded-2xl bg-[#050816] p-3 text-xs text-slate-500">
                    No saved chats yet.
                  </p>
                ) : (
                  history.slice(0, 12).map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => loadConversation(chat.id)}
                      disabled={loadingHistory}
                      className={`w-full rounded-2xl p-3 text-left transition ${
                        currentConversationId === chat.id
                          ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/20"
                          : "bg-[#050816] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold">
                          {chat.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {formatSavedTime(chat.updatedAt)}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {chat.lastMessage?.content || "No messages"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-black text-white">
                {userInitials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{fullName}</p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>

            {googleStatus.connected ? (
              <button
                onClick={disconnectGoogle}
                className="mt-4 w-full rounded-2xl border border-red-400/20 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
              >
                Disconnect Google
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                className="mt-4 w-full rounded-2xl border border-blue-400/25 px-4 py-2.5 text-xs font-bold text-blue-300 transition hover:bg-blue-500/10 hover:text-blue-200"
              >
                Connect Google
              </button>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col px-7 py-5">
          <header className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.45em] text-cyan-300">
                Multi-Tool AI Agent
              </p>

              <h2 className="mt-2 bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-3xl font-black tracking-tight text-transparent">
                Hi, {displayName} 👋
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Your AI workspace for Gmail, Calendar, documents, and automation.
              </p>
            </div>

            <div className="flex shrink-0 gap-3">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                ● Backend Online
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-slate-300">
                Gemini + Fallback
              </span>
            </div>
          </header>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => sendMessage(action.prompt)}
                className="group rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-left shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.075]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/25 to-cyan-400/15 text-lg ring-1 ring-white/10">
                  {action.icon}
                </div>

                <p className="mt-3 font-bold">{action.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#081120]/80 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-lg font-black">Conversation</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {currentConversationId
                    ? "Saved conversation"
                    : "New agent workspace"}
                </p>
              </div>

              <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-200">
                ✦ Agent Mode
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pb-32">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20">
                      ✦
                    </div>
                  )}

                  <div className="max-w-[78%]">
                    <div
                      className={`whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 shadow-lg ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-violet-500/20"
                          : "bg-white/[0.075] text-slate-100 shadow-black/10"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {msg.agent && (
                      <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs font-medium text-cyan-200">
                        Intent: {msg.agent.intent} · Tool:{" "}
                        {msg.agent.tool ?? "None"}
                      </div>
                    )}

                    <p
                      className={`mt-2 text-xs text-slate-600 ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-[#060A14]">
                      {userInitials}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
                    ✦
                  </div>

                  <div className="w-[620px] rounded-3xl border border-white/10 bg-white/[0.065] p-5 shadow-xl shadow-black/10">
                    <p className="text-sm font-semibold text-slate-200">
                      TaskPilot is working...
                    </p>

                    <div className="mt-5 grid grid-cols-4 gap-3">
                      {["Understand", "Plan", "Execute", "Respond"].map(
                        (label, i) => (
                          <div key={label}>
                            <div
                              className={`h-1.5 rounded-full ${
                                i <= step
                                  ? "bg-gradient-to-r from-cyan-400 to-violet-500"
                                  : "bg-slate-800"
                              }`}
                            />

                            <p
                              className={`mt-2 text-xs font-medium ${
                                i <= step ? "text-cyan-300" : "text-slate-500"
                              }`}
                            >
                              {label}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#050816] p-3">
                <input
                  ref={composerFileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      uploadComposerDocument(file);
                    }

                    e.target.value = "";
                  }}
                />

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask TaskPilot anything..."
                  className="flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />

                <button
                  type="button"
                  onClick={() => composerFileInputRef.current?.click()}
                  disabled={uploadingDocument}
                  title="Upload PDF or TXT"
                  className="rounded-2xl px-3 py-2 text-slate-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  📎
                </button>

                <button
                  type="button"
                  onClick={handleImageComingSoon}
                  title="Image upload coming soon"
                  className="rounded-2xl px-3 py-2 text-slate-500 hover:bg-white/[0.06] hover:text-white"
                >
                  🖼️
                </button>

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:scale-[1.02] disabled:opacity-50"
                >
                  Send
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-600">
                TaskPilot AI may make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </section>

        <aside className="min-h-0 space-y-4 overflow-y-auto border-l border-white/10 bg-[#070B16]/75 p-5 backdrop-blur-2xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                〽️
              </div>
              <h3 className="text-lg font-black">Agent Trace</h3>
            </div>

            {latestAgent ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-[#050816] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Intent
                  </p>
                  <p className="mt-1 font-bold text-cyan-300">
                    {latestAgent.intent}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#050816] p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Confidence
                    </p>
                    <p className="mt-1 font-bold">
                      {Math.round(latestAgent.confidence * 100)}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#050816] p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Tool
                    </p>
                    <p className="mt-1 truncate font-bold text-violet-300">
                      {latestAgent.tool ?? "None"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#050816] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Execution Steps
                  </p>

                  <div className="mt-3 space-y-2">
                    {latestAgent.steps.map((item, index) => (
                      <div
                        key={item}
                        className="flex gap-2 text-sm text-slate-300"
                      >
                        <span className="text-cyan-300">{index + 1}.</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[#050816] p-4">
                <p className="text-sm leading-6 text-slate-400">
                  Send a message to view intent, selected tool, confidence, and
                  execution steps.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-black">Connected Tools</h3>
              <span className="text-xs font-semibold text-cyan-300">Status</span>
            </div>

            <div className="space-y-3">
              {["Gmail", "Calendar"].map((tool) => (
                <div
                  key={tool}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#050816] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                      {tool === "Gmail" ? "📩" : "📅"}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold">{tool}</p>
                      <p className="truncate text-xs text-slate-500">
                        {googleStatus.connected
                          ? googleStatus.user?.email || "Connected"
                          : "Not connected"}
                      </p>
                    </div>
                  </div>

                  {googleStatus.connected ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={connectGoogle}
                      className="shrink-0 rounded-full border border-blue-400/30 px-3 py-1 text-xs text-blue-300 hover:bg-blue-500/10"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#050816] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                    📄
                  </div>

                  <div>
                    <p className="font-bold">Documents</p>
                    <p className="text-xs text-slate-500">
                      {documents.length} uploaded
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {documents.length > 0 ? "Ready" : "Upload"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#050816] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                    ⚡
                  </div>

                  <div>
                    <p className="font-bold">Automation</p>
                    <p className="text-xs text-slate-500">Coming soon</p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                  Soon
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">Documents</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {documents.length} uploaded
                </p>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {documents.length > 0 ? "Ready" : "Empty"}
              </span>
            </div>

            <div className="mt-4">
              <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#050816] px-4 py-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-white/[0.04]">
                <input
                  type="file"
                  accept=".txt,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {selectedFile ? selectedFile.name : "Upload PDF or TXT"}
              </label>

              <button
                onClick={uploadDocument}
                disabled={!selectedFile || uploadingDocument}
                className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#060A14] transition hover:scale-[1.01] disabled:opacity-45"
              >
                {uploadingDocument ? "Uploading..." : "Upload Document"}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {documents.slice(0, 4).map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#050816] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {document.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {document.totalChunks} chunk(s)
                    </p>
                  </div>

                  <span className="text-slate-600">⋮</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}