import { Request, Response } from "express";
import {
  clearConversations,
  getConversationById,
  getConversations,
} from "../database/chatStore";
import { getCurrentUserEmail } from "../utils/currentUser";

export async function getHistoryController(_req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();
    const conversations = await getConversations(userEmail);

    return res.json({
      success: true,
      userEmail,
      conversations,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load chat history.",
    });
  }
}

export async function getConversationController(req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();
    const conversationId = req.params.id;

    const conversation = await getConversationById(userEmail, conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found.",
      });
    }

    return res.json({
      success: true,
      userEmail,
      conversation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load conversation.",
    });
  }
}

export async function clearHistoryController(_req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();

    await clearConversations(userEmail);

    return res.json({
      success: true,
      userEmail,
      message: "Chat history cleared.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to clear chat history.",
    });
  }
}