import { UserModel } from "../models/user.model";

export type GoogleUserProfile = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export async function upsertGoogleUser(profile: GoogleUserProfile) {
  if (!profile.email) {
    return null;
  }

  const now = new Date().toISOString();

  const existingUser = await UserModel.findOne({
    email: profile.email,
  });

  if (existingUser) {
    existingUser.googleId = profile.id || existingUser.googleId;
    existingUser.name = profile.name || existingUser.name;
    existingUser.picture = profile.picture || existingUser.picture;
    existingUser.lastLoginAt = now;
    existingUser.updatedAt = now;

    await existingUser.save();

    return existingUser.toObject();
  }

  const user = await UserModel.create({
    googleId: profile.id || "",
    email: profile.email,
    name: profile.name || "",
    picture: profile.picture || "",
    provider: "google",
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return user.toObject();
}

export async function getUserByEmail(email: string) {
  return await UserModel.findOne({ email }).lean();
}