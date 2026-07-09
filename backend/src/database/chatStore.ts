import fs from "fs";
import path from "path";

export type StoredAgentTrace = {
  intent: string;
  confidence: number;
  tool: string | null;
  toolRequired: boolean;
  steps: string[];
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  agent?: StoredAgentTrace;
};

export type ChatConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredChatMessage[];
};

const STORAGE_DIR = path.resolve(process.cwd(), "storage");
const CHAT_HISTORY_FILE = path.join(STORAGE_DIR, "chat-history.json");

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readStore(): ChatConversation[] {
  ensureStorageDir();

  if (!fs.existsSync(CHAT_HISTORY_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(CHAT_HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as ChatConversation[];
  } catch {
    return [];
  }
}

function writeStore(conversations: ChatConversation[]) {
  ensureStorageDir();
  fs.writeFileSync(
    CHAT_HISTORY_FILE,
    JSON.stringify(conversations, null, 2),
    "utf-8"
  );
}

function createTitleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New Conversation";
  }

  return cleaned.length > 45 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

export function getAllConversations() {
  return readStore();
}

export function getConversationSummaries() {
  return readStore()
    .map((conversation) => {
      const lastMessage =
        conversation.messages[conversation.messages.length - 1] || null;

      return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
        lastMessage: lastMessage
          ? {
              role: lastMessage.role,
              content: lastMessage.content.slice(0, 120),
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function getConversationById(conversationId: string) {
  return readStore().find((conversation) => conversation.id === conversationId);
}

export function createConversation(title?: string) {
  const conversations = readStore();
  const now = new Date().toISOString();

  const conversation: ChatConversation = {
    id: generateId("conv"),
    title: title || "New Conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  conversations.push(conversation);
  writeStore(conversations);

  return conversation;
}

export function saveChatExchange(params: {
  conversationId?: string;
  userMessage: string;
  assistantMessage: string;
  agent?: StoredAgentTrace;
}) {
  const conversations = readStore();
  const now = new Date().toISOString();

  let conversation = params.conversationId
    ? conversations.find((item) => item.id === params.conversationId)
    : conversations[conversations.length - 1];

  if (!conversation) {
    conversation = {
      id: generateId("conv"),
      title: createTitleFromMessage(params.userMessage),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    conversations.push(conversation);
  }

  conversation.messages.push({
    id: generateId("msg"),
    role: "user",
    content: params.userMessage,
    createdAt: now,
  });

  conversation.messages.push({
    id: generateId("msg"),
    role: "assistant",
    content: params.assistantMessage,
    createdAt: now,
    agent: params.agent,
  });

  conversation.updatedAt = now;

  writeStore(conversations);

  return conversation;
}

export function clearChatHistory() {
  writeStore([]);
}
export function getRecentConversationContext(
  conversationId: string | undefined,
  limit = 8
) {
  if (!conversationId) {
    return "";
  }

  const conversation = getConversationById(conversationId);

  if (!conversation) {
    return "";
  }

  return conversation.messages
    .slice(-limit)
    .map((message) => {
      const roleLabel = message.role === "user" ? "User" : "Assistant";
      return `${roleLabel}: ${message.content}`;
    })
    .join("\n");
}