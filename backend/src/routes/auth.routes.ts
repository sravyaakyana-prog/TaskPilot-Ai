import express from "express";
import {
  googleCallbackController,
  googleDisconnectController,
  googleLoginController,
  googleStatusController,
} from "../controllers/auth.controller";

const router = express.Router();

router.get("/google", googleLoginController);
router.get("/google/callback", googleCallbackController);
router.get("/google/status", googleStatusController);
router.post("/google/disconnect", googleDisconnectController);
router.delete("/google/disconnect", googleDisconnectController);

export default router;