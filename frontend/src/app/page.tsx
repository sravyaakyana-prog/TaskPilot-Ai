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

type Message = {
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: AgentTrace;
};

const quickActions = [
  {
    icon: "📧",
    title: "Summarize Inbox",
    prompt: "Summarize my unread emails today",
  },
  {
    icon: "🔎",
    title: "Find Internships",
    prompt: "Find emails about internships",
  },
  {
    icon: "📅",
    title: "Today Calendar",
    prompt: "What meetings do I have today?",
  },
  {
    icon: "📄",
    title: "Summarize Doc",
    prompt: "What is this document about?",
  },
];

const navItems = [
  "Chat",
  "Gmail",
  "Calendar",
  "Documents",
  "Automation",
  "Settings",
];

function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const connectGoogle = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/documents");
      const data = await res.json();

      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch {
      setDocuments([]);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || uploadingDocument) return;

    setUploadingDocument(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://localhost:5000/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.success
            ? `📄 Document uploaded successfully.

File: ${data.document.fileName}
Chunks: ${data.document.totalChunks}

You can now ask questions about this document.`
            : data.error || "Failed to upload document.",
          time: timeNow(),
        },
      ]);

      setSelectedFile(null);
      await fetchDocuments();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Document upload failed. Make sure backend is running.",
          time: timeNow(),
        },
      ]);
    } finally {
      setUploadingDocument(false);
    }
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
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.agent) {
        setLatestAgent(data.agent);
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
        const res = await fetch("http://localhost:5000/api/auth/google/status");
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
    <main className="h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(124,58,237,0.32),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.22),transparent_28%)]" />

      <div className="relative grid h-screen grid-cols-[260px_1fr_330px]">
        <aside className="border-r border-white/10 bg-[#070B18]/80 px-5 py-6 backdrop-blur-xl">
          <div className="mb-10">
            <h1 className="text-2xl font-black">✦ TaskPilot AI</h1>
            <p className="mt-1 text-sm text-slate-400">
              AI productivity workspace
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => {
              const isActive = index === 0;
              const isGoogleTool = item === "Gmail" || item === "Calendar";
              const isDocumentTool = item === "Documents";

              return (
                <button
                  key={item}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm transition ${
                    isActive
                      ? "bg-white text-[#050816] shadow-lg"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{item}</span>

                  {!isActive && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        (isGoogleTool && googleStatus.connected) ||
                        (isDocumentTool && documents.length > 0)
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isGoogleTool && googleStatus.connected
                        ? "Connected"
                        : isDocumentTool && documents.length > 0
                        ? "Ready"
                        : "Soon"}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">Current Phase</p>
            <p className="mt-1 text-xs text-slate-400">
              Gmail + Calendar + Document RAG
            </p>
            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div className="h-2 w-[82%] rounded-full bg-gradient-to-r from-cyan-400 to-purple-500" />
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col px-8 py-7">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Multi-Tool AI Agent
              </p>
              <h2 className="mt-2 bg-gradient-to-r from-purple-200 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-black text-transparent">
                Good morning, Sravya
              </h2>
              <p className="mt-2 text-slate-400">
                One workspace for Gmail, Calendar, documents, and automation.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-300">
                ● Backend Online
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm text-slate-300">
                Mock Provider
              </span>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => sendMessage(action.prompt)}
                className="group rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07]"
              >
                <div className="text-xl">{action.icon}</div>
                <p className="mt-3 font-semibold">{action.title}</p>
                <p className="mt-1 text-xs text-slate-500">Run action</p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#081124]/85 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold">Conversation</h3>
                <p className="text-sm text-slate-400">Agent workspace</p>
              </div>

              <span className="rounded-full bg-purple-500/15 px-4 py-2 text-sm text-purple-300">
                Agent Mode
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
                      ✦
                    </div>
                  )}

                  <div className="max-w-[72%]">
                    <div
                      className={`whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "bg-white/[0.07] text-slate-100"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {msg.agent && (
                      <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                        Intent: {msg.agent.intent} · Tool:{" "}
                        {msg.agent.tool ?? "None"}
                      </div>
                    )}

                    <p
                      className={`mt-2 text-xs text-slate-500 ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
                    ✦
                  </div>

                  <div className="w-[520px] rounded-3xl bg-white/[0.07] p-5">
                    <p className="text-sm text-slate-300">
                      TaskPilot is working...
                    </p>

                    <div className="mt-5 grid grid-cols-4 gap-3">
                      {["Understand", "Plan", "Execute", "Respond"].map(
                        (label, i) => (
                          <div key={label}>
                            <div
                              className={`h-1.5 rounded-full ${
                                i <= step
                                  ? "bg-gradient-to-r from-cyan-400 to-purple-500"
                                  : "bg-slate-800"
                              }`}
                            />
                            <p
                              className={`mt-2 text-xs ${
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
              <div className="flex gap-3 rounded-3xl bg-[#050816] p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask TaskPilot anything..."
                  className="flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-500"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#050816] transition hover:scale-[1.02] disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 overflow-y-auto border-l border-white/10 bg-[#070B18]/75 p-6 backdrop-blur-xl">
          <div className="rounded-3xl bg-white/[0.045] p-5">
            <h3 className="text-lg font-bold">Agent Trace</h3>

            {latestAgent ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[#050816] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Intent
                  </p>
                  <p className="mt-1 font-semibold text-cyan-300">
                    {latestAgent.intent}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#050816] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Confidence
                  </p>
                  <p className="mt-1 font-semibold">
                    {Math.round(latestAgent.confidence * 100)}%
                  </p>
                </div>

                <div className="rounded-2xl bg-[#050816] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Selected Tool
                  </p>
                  <p className="mt-1 font-semibold text-purple-300">
                    {latestAgent.tool ?? "None"}
                  </p>
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
              <p className="mt-5 text-sm text-slate-400">
                Send a message to view intent, selected tool, and execution
                steps.
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white/[0.045] p-5">
            <h3 className="text-lg font-bold">Connected Tools</h3>

            <div className="mt-5 space-y-4">
              {["Gmail", "Calendar"].map((tool) => (
                <div
                  key={tool}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{tool}</p>
                    <p className="truncate text-xs text-slate-500">
                      {googleStatus.connected
                        ? googleStatus.user?.email || "Connected"
                        : "Not connected"}
                    </p>
                  </div>

                  {googleStatus.connected ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
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

              <div className="rounded-2xl border border-white/10 bg-[#050816] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Documents</p>
                    <p className="text-xs text-slate-500">
                      {documents.length > 0
                        ? `${documents.length} uploaded`
                        : "No documents uploaded"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      documents.length > 0
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {documents.length > 0 ? "Ready" : "Upload"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#050816]"
                  />

                  <button
                    onClick={uploadDocument}
                    disabled={!selectedFile || uploadingDocument}
                    className="w-full rounded-2xl bg-white px-4 py-2 text-xs font-bold text-[#050816] disabled:opacity-50"
                  >
                    {uploadingDocument ? "Uploading..." : "Upload Document"}
                  </button>

                  {documents.slice(0, 3).map((document) => (
                    <div
                      key={document.id}
                      className="rounded-xl bg-white/[0.04] p-3"
                    >
                      <p className="truncate text-xs font-semibold">
                        {document.fileName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.totalChunks} chunk(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Automation</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                  Soon
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 p-5">
            <h3 className="text-lg font-bold">Next Build</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Upgrade document search with embeddings so TaskPilot can answer
              deeper semantic questions from PDFs, notes, and project files.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}