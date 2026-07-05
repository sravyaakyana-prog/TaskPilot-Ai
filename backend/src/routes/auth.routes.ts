import { Router } from "express";
import {
  googleCallbackController,
  googleLoginController,
  googleLogoutController,
  googleStatusController,
} from "../controllers/auth.controller";

const router = Router();

router.get("/google", googleLoginController);
router.get("/google/callback", googleCallbackController);
router.get("/google/status", googleStatusController);
router.post("/google/logout", googleLogoutController);

export default router;