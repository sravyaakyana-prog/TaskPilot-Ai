import fs from "fs";
import path from "path";
import { Credentials } from "google-auth-library";

type GoogleUser = {
  email: string;
  name?: string;
  picture?: string;
};

type StoredGoogleSession = {
  tokens: Credentials;
  user: GoogleUser;
};

const STORAGE_DIR = path.resolve(process.cwd(), "storage");
const TOKEN_FILE = path.join(STORAGE_DIR, "google-session.json");

let googleTokens: Credentials | null = null;
let googleUser: GoogleUser | null = null;

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadGoogleSessionFromFile() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return;

    const rawData = fs.readFileSync(TOKEN_FILE, "utf-8");
    const session = JSON.parse(rawData) as StoredGoogleSession;

    googleTokens = session.tokens;
    googleUser = session.user;
  } catch (error) {
    console.error("Failed to load Google session:", error);
    googleTokens = null;
    googleUser = null;
  }
}

function saveGoogleSessionToFile(tokens: Credentials, user: GoogleUser) {
  try {
    ensureStorageDir();

    const session: StoredGoogleSession = {
      tokens,
      user,
    };

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(session, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save Google session:", error);
  }
}

function deleteGoogleSessionFile() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
  } catch (error) {
    console.error("Failed to delete Google session:", error);
  }
}

loadGoogleSessionFromFile();

export function saveGoogleSession(tokens: Credentials, user: GoogleUser) {
  googleTokens = tokens;
  googleUser = user;
  saveGoogleSessionToFile(tokens, user);
}

export function getGoogleTokens() {
  if (!googleTokens) {
    loadGoogleSessionFromFile();
  }

  return googleTokens;
}

export function getGoogleUser() {
  if (!googleUser) {
    loadGoogleSessionFromFile();
  }

  return googleUser;
}

export function clearGoogleSession() {
  googleTokens = null;
  googleUser = null;
  deleteGoogleSessionFile();
}

export function isGoogleConnected() {
  if (!googleTokens) {
    loadGoogleSessionFromFile();
  }

  return Boolean(googleTokens?.access_token || googleTokens?.refresh_token);
}