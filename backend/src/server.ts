import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "TaskPilot AI backend is running",
    provider: env.LLM_PROVIDER,
  });
});

app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

app.listen(Number(env.PORT), () => {
  console.log(`TaskPilot AI backend running on port ${env.PORT}`);
});