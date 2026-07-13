import { getGoogleUser } from "../database/tokenStore";

export const GUEST_USER_EMAIL = "guest@taskpilot.local";

export function getCurrentUserEmail() {
  const user = getGoogleUser();

  if (user?.email) {
    return user.email;
  }

  return GUEST_USER_EMAIL;
}