import mongoose, { Schema } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    agent: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatConversationSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      default: "guest@taskpilot.local",
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: "New Chat",
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ChatConversationSchema.index({ userEmail: 1, updatedAt: -1 });

export const ChatConversationModel =
  mongoose.models.ChatConversation ||
  mongoose.model(
    "ChatConversation",
    ChatConversationSchema,
    "chat_conversations"
  );