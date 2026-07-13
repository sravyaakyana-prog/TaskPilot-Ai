import { Request, Response } from "express";
import { getDocuments } from "../database/documentStore";
import { processUploadedDocument } from "../services/document.service";
import { getCurrentUserEmail } from "../utils/currentUser";

export async function uploadDocumentController(req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please upload a PDF or TXT file.",
      });
    }

    const document = await processUploadedDocument(req.file, userEmail);

    return res.json({
      success: true,
      userEmail,
      document,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Could not process this document. Please upload a readable PDF or TXT file.",
    });
  }
}

export async function getDocumentsController(_req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();
    const documents = await getDocuments(userEmail);

    return res.json({
      success: true,
      userEmail,
      documents: documents.map((document) => ({
        id: document.id,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
        totalChunks: document.totalChunks,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load documents.",
    });
  }
}