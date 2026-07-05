import { google } from "googleapis";
import { googleOAuthClient } from "../../config/google";
import { getGoogleTokens } from "../../database/tokenStore";

export function getCalendarClient() {
  const tokens = getGoogleTokens();

  if (!tokens) {
    throw new Error(
      "Google Calendar is not connected. Please connect your Google account first."
    );
  }

  googleOAuthClient.setCredentials(tokens);

  return google.calendar({
    version: "v3",
    auth: googleOAuthClient,
  });
}