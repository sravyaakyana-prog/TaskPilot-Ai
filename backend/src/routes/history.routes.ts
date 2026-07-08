import { Router } from "express";
import {
  clearHistoryController,
  createHistoryController,
  getConversationController,
  listHistoryController,
} from "../controllers/history.controller";

const router = Router();

router.get("/", listHistoryController);
router.get("/:conversationId", getConversationController);
router.post("/", createHistoryController);
router.delete("/", clearHistoryController);

export default router;