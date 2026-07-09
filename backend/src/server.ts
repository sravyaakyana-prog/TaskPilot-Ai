import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import documentRoutes from "./routes/document.routes";
import historyRoutes from "./routes/history.routes";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "TaskPilot AI backend is running.",
    health: "/api/health",
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    status: "healthy",
    service: "TaskPilot AI Backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/history", historyRoutes);

app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: "Route not found.",
  });
});

app.use(
  (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error.",
    });
  }
);

async function startServer() {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log("====================================");
    console.log("TaskPilot AI backend started");
    console.log(`Port: ${env.PORT}`);
    console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    console.log(`Health: http://localhost:${env.PORT}/api/health`);
    console.log("====================================");
  });
}

startServer();