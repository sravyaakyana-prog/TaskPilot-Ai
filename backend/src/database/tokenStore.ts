import { GoogleTokenSessionModel } from "../models/googleToken.model";

export type GoogleUser = {
  email: string;
  name?: string;
  picture?: string;
};

export type GoogleSession = {
  user: GoogleUser;
  tokens: any;
  connected: boolean;
  updatedAt?: string;
};

const ACTIVE_SESSION_KEY = "active-google-session";

let activeSession: GoogleSession | null = null;

export async function initializeGoogleSession() {
  try {
    const session = await GoogleTokenSessionModel.findOne({
      key: ACTIVE_SESSION_KEY,
      connected: true,
    }).lean();

    if (!session) {
      activeSession = null;
      console.log("Google session: not connected");
      return null;
    }

    activeSession = {
      user: {
        email: session.user?.email || session.userEmail,
        name: session.user?.name || "",
        picture: session.user?.picture || "",
      },
      tokens: session.tokens,
      connected: Boolean(session.connected),
      updatedAt: session.updatedAt
        ? new Date(session.updatedAt).toISOString()
        : new Date().toISOString(),
    };

    console.log(`Google session loaded for: ${activeSession.user.email}`);

    return activeSession;
  } catch (error: any) {
    console.error("Failed to initialize Google session:", error.message);
    activeSession = null;
    return null;
  }
}

export async function saveGoogleSession(tokens: any, user: GoogleUser) {
  const mergedTokens = {
    ...(activeSession?.tokens || {}),
    ...(tokens || {}),
  };

  activeSession = {
    user: {
      email: user.email,
      name: user.name || "",
      picture: user.picture || "",
    },
    tokens: mergedTokens,
    connected: true,
    updatedAt: new Date().toISOString(),
  };

  await GoogleTokenSessionModel.findOneAndUpdate(
    {
      key: ACTIVE_SESSION_KEY,
    },
    {
      $set: {
        key: ACTIVE_SESSION_KEY,
        userEmail: user.email,
        user: {
          email: user.email,
          name: user.name || "",
          picture: user.picture || "",
        },
        tokens: mergedTokens,
        connected: true,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  return activeSession;
}

export function getGoogleSession() {
  return activeSession;
}

export function getGoogleTokens() {
  return activeSession?.tokens || null;
}

export function getGoogleUser() {
  return activeSession?.user || null;
}

export function isGoogleConnected() {
  const tokens = activeSession?.tokens;

  return Boolean(
    activeSession?.connected && (tokens?.access_token || tokens?.refresh_token)
  );
}

export async function clearGoogleSession() {
  activeSession = null;

  await GoogleTokenSessionModel.findOneAndUpdate(
    {
      key: ACTIVE_SESSION_KEY,
    },
    {
      $set: {
        connected: false,
      },
    }
  );

  return {
    success: true,
  };
}

export async function refreshGoogleTokens(tokens: any) {
  if (!activeSession) {
    return null;
  }

  const mergedTokens = {
    ...(activeSession.tokens || {}),
    ...(tokens || {}),
  };

  activeSession = {
    ...activeSession,
    tokens: mergedTokens,
    updatedAt: new Date().toISOString(),
  };

  await GoogleTokenSessionModel.findOneAndUpdate(
    {
      key: ACTIVE_SESSION_KEY,
    },
    {
      $set: {
        tokens: mergedTokens,
        connected: true,
      },
    },
    {
      new: true,
    }
  );

  return activeSession;
}