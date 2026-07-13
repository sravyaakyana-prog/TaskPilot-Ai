import express, { NextFunction, Request, Response } from "express";
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

function deleteTempFile(filePath?: string) {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup failure.
  }
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
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (![".pdf", ".txt"].includes(ext)) {
      return callback(
        new Error("Unsupported file type. Please upload only a PDF or TXT file.")
      );
    }

    callback(null, true);
  },
});

function handleUploadErrors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("file")(req, res, (error: any) => {
    if (!error) {
      return next();
    }

    deleteTempFile(req.file?.path);

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error:
            "File is too large. Please upload a PDF or TXT file under 12MB.",
        });
      }

      return res.status(400).json({
        success: false,
        error: "File upload failed. Please try again.",
      });
    }

    return res.status(400).json({
      success: false,
      error:
        error.message ||
        "Upload failed. Please upload a valid PDF or TXT file.",
    });
  });
}

router.get("/", getDocumentsController);
router.post("/upload", handleUploadErrors, uploadDocumentController);

export default router;