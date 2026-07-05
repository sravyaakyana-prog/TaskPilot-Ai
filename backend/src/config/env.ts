import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

export const env = {
  PORT: (process.env.PORT || "5000").trim(),
  LLM_PROVIDER: (process.env.LLM_PROVIDER || "mock").trim().toLowerCase(),
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || "").trim(),

  GOOGLE_CLIENT_ID: (process.env.GOOGLE_CLIENT_ID || "").trim(),
  GOOGLE_CLIENT_SECRET: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
  GOOGLE_REDIRECT_URI: (
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback"
  ).trim(),

  FRONTEND_URL: (process.env.FRONTEND_URL || "http://localhost:3000").trim(),
};