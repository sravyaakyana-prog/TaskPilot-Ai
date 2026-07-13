import mongoose, { Schema } from "mongoose";

const GoogleTokenSessionSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: "active-google-session",
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      email: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        default: "",
      },
      picture: {
        type: String,
        default: "",
      },
    },
    tokens: {
      type: Schema.Types.Mixed,
      required: true,
    },
    connected: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const GoogleTokenSessionModel =
  mongoose.models.GoogleTokenSession ||
  mongoose.model(
    "GoogleTokenSession",
    GoogleTokenSessionSchema,
    "google_token_sessions"
  );