import fs from "fs";
import path from "path";
import {
  DocumentChunk,
  saveDocument,
  StoredDocument,
} from "../database/documentStore";

const pdfParsePackage = require("pdf-parse");

const pdfParse =
  typeof pdfParsePackage === "function"
    ? pdfParsePackage
    : pdfParsePackage.default;

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(text: string) {
  return text
    .replace(/\0/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(
  text: string,
  documentId: string,
  fileName: string
): DocumentChunk[] {
  const cleaned = cleanText(text);
  const chunkSize = 900;
  const overlap = 120;

  const chunks: DocumentChunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const chunkTextValue = cleaned.slice(start, end).trim();

    if (chunkTextValue.length > 0) {
      chunks.push({
        id: generateId("chunk"),
        documentId,
        fileName,
        chunkIndex,
        text: chunkTextValue,
      });

      chunkIndex++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

async function extractTextFromPdf(filePath: string) {
  try {
    if (!pdfParse) {
      throw new Error("PDF parser is not available.");
    }

    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);

    return data.text || "";
  } catch {
    throw new Error(
      "Could not read this PDF. Please upload a text-based PDF or TXT file."
    );
  }
}

function extractTextFromTxt(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error("Could not read this TXT file.");
  }
}

export async function processUploadedDocument(
  file: Express.Multer.File,
  userEmail: string
) {
  if (!file) {
    throw new Error("No file uploaded.");
  }

  if (!fs.existsSync(file.path)) {
    throw new Error("Uploaded file was not found on the server.");
  }

  const ext = path.extname(file.originalname).toLowerCase();

  let extractedText = "";

  if (ext === ".pdf") {
    extractedText = await extractTextFromPdf(file.path);
  } else if (ext === ".txt") {
    extractedText = extractTextFromTxt(file.path);
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or TXT file.");
  }

  const cleanedText = cleanText(extractedText);

  if (!cleanedText || cleanedText.length < 20) {
    throw new Error(
      "No readable text found in this document. Please upload a text-based PDF or TXT file."
    );
  }

  const documentId = generateId("doc");
  const chunks = chunkText(cleanedText, documentId, file.originalname);

  if (chunks.length === 0) {
    throw new Error("Could not create searchable chunks from this document.");
  }

  const document: StoredDocument = {
    id: documentId,
    userEmail,
    fileName: file.originalname,
    uploadedAt: new Date().toISOString(),
    totalChunks: chunks.length,
    chunks,
  };

  await saveDocument(document, userEmail);

  return {
    id: document.id,
    fileName: document.fileName,
    totalChunks: document.totalChunks,
    uploadedAt: document.uploadedAt,
  };
}