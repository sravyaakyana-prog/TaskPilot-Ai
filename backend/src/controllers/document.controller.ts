import { Request, Response } from "express";
import {
  getDocuments,
} from "../database/documentStore";
import {
  DocumentProcessingError,
  processUploadedDocument,
} from "../services/document.service";
import { getCurrentUserEmail } from "../utils/currentUser";

function getSafeDocumentError(error: any) {
  if (error instanceof DocumentProcessingError) {
    return {
      statusCode: error.statusCode || 400,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message:
      error?.message ||
      "Could not process this document. Please upload a readable PDF or TXT file.",
  };
}

export async function uploadDocumentController(req: Request, res: Response) {
  try {
    console.log("DOCUMENT_UPLOAD_CONTROLLER_STARTED");

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    const userEmail = getCurrentUserEmail();

    console.log("DOCUMENT_UPLOAD_FILE_RECEIVED:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      userEmail,
    });

    const document = await processUploadedDocument(req.file, userEmail);

    console.log("DOCUMENT_UPLOAD_CONTROLLER_SUCCESS:", document);

    return res.status(201).json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error("DOCUMENT_UPLOAD_CONTROLLER_ERROR:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });

    const safeError = getSafeDocumentError(error);

    return res.status(safeError.statusCode).json({
      success: false,
      error: safeError.message,
    });
  }
}

export async function getDocumentsController(req: Request, res: Response) {
  try {
    const userEmail = getCurrentUserEmail();
    const documents = await getDocuments(userEmail);

    return res.status(200).json({
      success: true,
      documents,
    });
    } catch (error: any) {
    console.error("DOCUMENT_UPLOAD_CONTROLLER_ERROR:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Document upload failed.",
      debug: {
        name: error?.name,
        message: error?.message,
      },
    });
  }