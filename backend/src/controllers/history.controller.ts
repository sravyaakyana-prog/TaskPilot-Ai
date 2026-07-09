import { Request, Response } from "express";
import {
  clearChatHistory,
  createConversation,
  getConversationById,
  getConversationSummaries,
} from "../database/chatStore";

export async function listHistoryController(_req: Request, res: Response) {
  try {
    const conversations = await getConversationSummaries();

    return res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("List history error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load chat history.",
    });
  }
}

export async function getConversationController(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const conversation = await getConversationById(conversationId);

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
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load conversation.",
    });
  }
}

export async function createHistoryController(req: Request, res: Response) {
  try {
    const title =
      typeof req.body?.title === "string" && req.body.title.trim()
        ? req.body.title.trim()
        : "New Conversation";

    const conversation = await createConversation(title);

    return res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Create history error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create conversation.",
    });
  }
}

export async function clearHistoryController(_req: Request, res: Response) {
  try {
    await clearChatHistory();

    return res.json({
      success: true,
      message: "Chat history cleared successfully.",
    });
  } catch (error) {
    console.error("Clear history error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to clear chat history.",
    });
  }
}