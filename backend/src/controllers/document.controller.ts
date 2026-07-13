import { Request, Response } from "express";
import { getDocuments } from "../database/documentStore";
import {
  DocumentProcessingError,
  processUploadedDocument,
} from "../services/document.service";
import { getCurrentUserEmail } from "../utils/currentUser";

function getSafeDocumentError(error: any) {
  if (error instanceof DocumentProcessingError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  const rawMessage = String(error?.message || "").toLowerCase();

  if (rawMessage.includes("file too large")) {
    return {
      statusCode: 400,
      message: "File is too large. Please upload a PDF or TXT file under 12MB.",
    };
  }

  if (rawMessage.includes("unsupported file type")) {
    return {
      statusCode: 400,
      message: "Unsupported file type. Please upload only a PDF or TXT file.",
    };
  }

  if (rawMessage.includes("no readable text")) {
    return {
      statusCode: 400,
      message:
        "No readable text found. Please upload a text-based PDF or TXT file.",
    };
  }

  return {
    statusCode: 500,
    message:
      "Could not process this document. Please upload a readable PDF or TXT file.",
  };
}

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
      message: "Document uploaded and indexed successfully.",
      document,
    });
  } catch (error: any) {
    const safeError = getSafeDocumentError(error);

    return res.status(safeError.statusCode).json({
      success: false,
      error: safeError.message,
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
  } catch {
    return res.status(500).json({
      success: false,
      error: "Failed to load uploaded documents.",
    });
  }
}