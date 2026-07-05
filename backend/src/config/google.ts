import { google } from "googleapis";
import { env } from "./env";

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth credentials are missing in .env");
}

export const googleOAuthClient = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export const googleScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",

  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",

  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];