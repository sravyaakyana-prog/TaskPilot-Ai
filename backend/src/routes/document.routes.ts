import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  listDocumentsController,
  uploadDocumentController,
} from "../controllers/document.controller";

const router = Router();

const uploadDir = path.resolve(process.cwd(), "uploads");

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.post("/upload", upload.single("file"), uploadDocumentController);
router.get("/", listDocumentsController);

export default router;