import { Request, Response } from "express";
import { google } from "googleapis";
import { env } from "../config/env";
import { googleOAuthClient, googleScopes } from "../config/google";
import { upsertGoogleUser } from "../database/userStore";
import {
  clearGoogleSession,
  getGoogleUser,
  isGoogleConnected,
  saveGoogleSession,
} from "../database/tokenStore";

export function googleLoginController(_req: Request, res: Response) {
  try {
    const authUrl = googleOAuthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: googleScopes,
    });

    return res.redirect(authUrl);
  } catch (error: any) {
    console.error("Google login error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to start Google OAuth.",
    });
  }
}

export async function googleCallbackController(req: Request, res: Response) {
  try {
    const code = req.query.code as string | undefined;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Missing Google OAuth code.",
      });
    }

    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: googleOAuthClient,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();

    const googleUser = {
      id: userInfo.data.id || "",
      email: userInfo.data.email || "",
      name: userInfo.data.name || "",
      picture: userInfo.data.picture || "",
    };

    await upsertGoogleUser(googleUser);

    saveGoogleSession(tokens, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    return res.redirect(`${env.FRONTEND_URL}?gmail=connected`);
  } catch (error: any) {
    console.error("Google callback error:", error);

    return res.redirect(`${env.FRONTEND_URL}?gmail=error`);
  }
}

export function googleStatusController(_req: Request, res: Response) {
  return res.json({
    success: true,
    connected: isGoogleConnected(),
    user: getGoogleUser(),
  });
}

export function googleLogoutController(_req: Request, res: Response) {
  clearGoogleSession();

  return res.json({
    success: true,
    message: "Google session cleared.",
  });
}