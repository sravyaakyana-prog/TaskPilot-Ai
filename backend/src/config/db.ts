import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    console.warn("MongoDB URI is missing. Add MONGODB_URI in backend/.env");
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}