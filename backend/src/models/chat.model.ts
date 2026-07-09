import mongoose, { Schema } from "mongoose";

const AgentTraceSchema = new Schema(
  {
    intent: { type: String, required: true },
    confidence: { type: Number, required: true },
    tool: { type: String, default: null },
    toolRequired: { type: Boolean, required: true },
    steps: [{ type: String }],
  },
  { _id: false }
);

const ChatMessageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    createdAt: { type: String, required: true },
    agent: {
      type: AgentTraceSchema,
      required: false,
    },
  },
  { _id: false }
);

const ChatConversationSchema = new Schema(
  {
    title: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    messages: [ChatMessageSchema],
  },
  {
    collection: "chat_conversations",
  }
);

export const ChatConversationModel =
  mongoose.models.ChatConversation ||
  mongoose.model("ChatConversation", ChatConversationSchema);