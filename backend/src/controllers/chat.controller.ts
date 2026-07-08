import { Request, Response } from "express";
import { generateChatReply } from "../services/chat.service";

export async function chatController(req: Request, res: Response) {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    const result = await generateChatReply(message, conversationId);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Chat controller error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate response.",
    });
  }
}