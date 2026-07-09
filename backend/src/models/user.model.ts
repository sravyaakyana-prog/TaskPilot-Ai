import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    googleId: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },
    provider: { type: String, default: "google" },
    lastLoginAt: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "users",
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);