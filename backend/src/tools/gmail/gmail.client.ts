import { google } from "googleapis";
import { googleOAuthClient } from "../../config/google";
import { getGoogleTokens } from "../../database/tokenStore";

export function getGmailClient() {
  const tokens = getGoogleTokens();

  if (!tokens) {
    throw new Error("Gmail is not connected. Please connect your Google account first.");
  }

  googleOAuthClient.setCredentials(tokens);

  return google.gmail({
    version: "v1",
    auth: googleOAuthClient,
  });
}