import mongoose from "mongoose";
import { ChatConversationModel } from "../models/chat.model";

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

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTitleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New Conversation";
  }

  return cleaned.length > 45 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

function toClientConversation(conversation: any): ChatConversation {
  return {
    id: conversation._id.toString(),
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: (conversation.messages || []).map((message: any) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      agent: message.agent,
    })),
  };
}

function isValidMongoId(id?: string) {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
}

export async function getAllConversations() {
  const conversations = await ChatConversationModel.find()
    .sort({ updatedAt: -1 })
    .lean();

  return conversations.map(toClientConversation);
}

export async function getConversationSummaries() {
  const conversations = await ChatConversationModel.find()
    .sort({ updatedAt: -1 })
    .lean();

  return conversations.map((conversation: any) => {
    const messages = conversation.messages || [];
    const lastMessage = messages[messages.length - 1] || null;

    return {
      id: conversation._id.toString(),
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: messages.length,
      lastMessage: lastMessage
        ? {
            role: lastMessage.role,
            content: lastMessage.content.slice(0, 120),
            createdAt: lastMessage.createdAt,
          }
        : null,
    };
  });
}

export async function getConversationById(conversationId: string) {
  if (!isValidMongoId(conversationId)) {
    return null;
  }

  const conversation = await ChatConversationModel.findById(conversationId).lean();

  if (!conversation) {
    return null;
  }

  return toClientConversation(conversation);
}

export async function createConversation(title?: string) {
  const now = new Date().toISOString();

  const conversation = await ChatConversationModel.create({
    title: title || "New Conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  });

  return toClientConversation(conversation.toObject());
}

export async function saveChatExchange(params: {
  conversationId?: string;
  userMessage: string;
  assistantMessage: string;
  agent?: StoredAgentTrace;
}) {
  const now = new Date().toISOString();

  let conversation = null;

  if (isValidMongoId(params.conversationId)) {
    conversation = await ChatConversationModel.findById(params.conversationId);
  }

  if (!conversation) {
    conversation = new ChatConversationModel({
      title: createTitleFromMessage(params.userMessage),
      createdAt: now,
      updatedAt: now,
      messages: [],
    });
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

  await conversation.save();

  return toClientConversation(conversation.toObject());
}

export async function getRecentConversationContext(
  conversationId: string | undefined,
  limit = 8
) {
  if (!conversationId || !isValidMongoId(conversationId)) {
    return "";
  }

  const conversation = await getConversationById(conversationId);

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

export async function clearChatHistory() {
  await ChatConversationModel.deleteMany({});
}