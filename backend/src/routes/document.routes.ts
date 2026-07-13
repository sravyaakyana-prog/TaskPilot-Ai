import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  getDocumentsController,
  uploadDocumentController,
} from "../controllers/document.controller";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeFileName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
      return callback(
        new Error("Unsupported file type. Please upload a PDF or TXT file.")
      );
    }

    callback(null, true);
  },
});

router.get("/", getDocumentsController);
router.post("/upload", upload.single("file"), uploadDocumentController);

export default router;