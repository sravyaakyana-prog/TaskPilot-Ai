import { Request, Response } from "express";
import { z } from "zod";
import { generateChatReply } from "../services/chat.service";

const chatSchema = z.object({
  message: z.string().min(1),
});

export async function chatController(req: Request, res: Response) {
  try {
    const parsed = chatSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message,
      });
    }

    const result = await generateChatReply(parsed.data.message);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}