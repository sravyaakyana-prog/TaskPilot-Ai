import { ChatConversationModel } from "../models/chat.model";
import { GUEST_USER_EMAIL } from "../utils/currentUser";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  agent?: any;
  createdAt?: string;
};

export type ChatConversation = {
  id: string;
  userEmail: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: ChatMessage | null;
};

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTitle(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New Chat";
  }

  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
}

function normalizeConversation(conversation: any): ChatConversation {
  const messages = (conversation.messages || []).map((message: any) => ({
    role: message.role,
    content: message.content,
    agent: message.agent || null,
    createdAt: message.createdAt
      ? new Date(message.createdAt).toISOString()
      : new Date().toISOString(),
  }));

  return {
    id: conversation.id,
    userEmail: conversation.userEmail || GUEST_USER_EMAIL,
    title: conversation.title || "New Chat",
    messages,
    createdAt: conversation.createdAt
      ? new Date(conversation.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: conversation.updatedAt
      ? new Date(conversation.updatedAt).toISOString()
      : new Date().toISOString(),
    messageCount: messages.length,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
  };
}

function userFilter(userEmail: string) {
  return {
    $or: [
      { userEmail },
      {
        userEmail: {
          $exists: false,
        },
      },
    ],
  };
}

export async function createConversation(
  userEmail: string,
  firstUserMessage: string,
  messages: ChatMessage[] = []
) {
  const now = new Date();

  const conversation = await ChatConversationModel.create({
    id: generateId("chat"),
    userEmail: userEmail || GUEST_USER_EMAIL,
    title: createTitle(firstUserMessage),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      agent: message.agent || null,
      createdAt: message.createdAt ? new Date(message.createdAt) : now,
    })),
  });

  return normalizeConversation(conversation);
}

export async function appendMessagesToConversation(
  userEmail: string,
  conversationId: string,
  messages: ChatMessage[]
) {
  const formattedMessages = messages.map((message) => ({
    role: message.role,
    content: message.content,
    agent: message.agent || null,
    createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
  }));

  const conversation = await ChatConversationModel.findOneAndUpdate(
    {
      id: conversationId,
      ...userFilter(userEmail || GUEST_USER_EMAIL),
    },
    {
      $push: {
        messages: {
          $each: formattedMessages,
        },
      },
      $set: {
        userEmail: userEmail || GUEST_USER_EMAIL,
      },
    },
    {
      new: true,
    }
  );

  if (!conversation) {
    return null;
  }

  return normalizeConversation(conversation);
}

export async function saveChatTurn(params: {
  userEmail: string;
  conversationId?: string | null;
  userMessage: string;
  assistantMessage: string;
  agent?: any;
}) {
  const userEmail = params.userEmail || GUEST_USER_EMAIL;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: params.userMessage,
      createdAt: new Date().toISOString(),
    },
    {
      role: "assistant",
      content: params.assistantMessage,
      agent: params.agent || null,
      createdAt: new Date().toISOString(),
    },
  ];

  if (!params.conversationId) {
    return createConversation(userEmail, params.userMessage, messages);
  }

  const existingConversation = await appendMessagesToConversation(
    userEmail,
    params.conversationId,
    messages
  );

  if (existingConversation) {
    return existingConversation;
  }

  return createConversation(userEmail, params.userMessage, messages);
}

export async function getConversations(userEmail: string) {
  const conversations = await ChatConversationModel.find(
    userFilter(userEmail || GUEST_USER_EMAIL)
  )
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  return conversations.map(normalizeConversation);
}

export async function getConversationById(
  userEmail: string,
  conversationId: string
) {
  const conversation = await ChatConversationModel.findOne({
    id: conversationId,
    ...userFilter(userEmail || GUEST_USER_EMAIL),
  }).lean();

  if (!conversation) {
    return null;
  }

  return normalizeConversation(conversation);
}

export async function clearConversations(userEmail: string) {
  await ChatConversationModel.deleteMany(
    userFilter(userEmail || GUEST_USER_EMAIL)
  );

  return {
    success: true,
  };
}

export async function getAllConversations(userEmail = GUEST_USER_EMAIL) {
  return getConversations(userEmail);
}

export async function clearAllConversations(userEmail = GUEST_USER_EMAIL) {
  return clearConversations(userEmail);
}