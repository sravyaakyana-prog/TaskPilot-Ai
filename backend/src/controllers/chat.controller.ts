import { Request, Response } from "express";
import { handleChatMessage } from "../services/chat.service";

export async function chatController(req: Request, res: Response) {
  try {
    const message = String(req.body.message || "").trim();
    const conversationId = req.body.conversationId || null;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    const result = await handleChatMessage(message, conversationId);

    return res.json(result);
  } catch (error: any) {
    console.error("Chat controller error:", error.message || error);

    return res.status(200).json({
      success: true,
      reply:
        "I had trouble generating a response from the AI provider, but TaskPilot is still running. Please try again.",
      conversationId: null,
      agent: {
        intent: "GENERAL_CHAT",
        confidence: 0.5,
        tool: null,
        toolRequired: false,
        steps: [
          "Received user message",
          "AI provider failed",
          "Returned safe fallback response",
        ],
      },
    });
  }
}

export const handleChatController = chatController;
export default chatController;