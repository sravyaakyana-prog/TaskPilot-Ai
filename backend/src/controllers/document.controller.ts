import { Request, Response } from "express";
import { getAllDocuments } from "../database/documentStore";
import { processUploadedDocument } from "../services/document.service";

export async function uploadDocumentController(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    const document = await processUploadedDocument(req.file);

    return res.json({
      success: true,
      message: "Document uploaded and processed successfully.",
      document,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process document.",
    });
  }
}

export function listDocumentsController(_req: Request, res: Response) {
  const documents = getAllDocuments().map((document) => ({
    id: document.id,
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
    totalChunks: document.totalChunks,
  }));

  return res.json({
    success: true,
    documents,
  });
}