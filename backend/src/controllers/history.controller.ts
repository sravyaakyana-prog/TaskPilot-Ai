import { Request, Response } from "express";
import {
  clearChatHistory,
  createConversation,
  getConversationById,
  getConversationSummaries,
} from "../database/chatStore";

export function listHistoryController(_req: Request, res: Response) {
  const conversations = getConversationSummaries();

  return res.json({
    success: true,
    conversations,
  });
}

export function getConversationController(req: Request, res: Response) {
  const { conversationId } = req.params;

  const conversation = getConversationById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: "Conversation not found.",
    });
  }

  return res.json({
    success: true,
    conversation,
  });
}

export function createHistoryController(req: Request, res: Response) {
  const title =
    typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "New Conversation";

  const conversation = createConversation(title);

  return res.json({
    success: true,
    conversation,
  });
}

export function clearHistoryController(_req: Request, res: Response) {
  clearChatHistory();

  return res.json({
    success: true,
    message: "Chat history cleared successfully.",
  });
}