import express from "express";
import {
  clearHistoryController,
  getConversationController,
  getHistoryController,
} from "../controllers/history.controller";

const router = express.Router();

router.get("/", getHistoryController);
router.get("/:id", getConversationController);
router.delete("/", clearHistoryController);

export default router;