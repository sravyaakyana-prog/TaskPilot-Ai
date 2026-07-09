import fs from "fs";
import path from "path";
import {
  DocumentChunk,
  saveDocument,
  StoredDocument,
} from "../database/documentStore";

const pdfParse = require("pdf-parse");

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
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
  const buffer = fs.readFileSync(filePath);

  const data = await pdfParse(buffer);

  return data.text || "";
}

function extractTextFromTxt(filePath: string) {
  return fs.readFileSync(filePath, "utf-8");
}

export async function processUploadedDocument(file: Express.Multer.File) {
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

  if (!cleanedText) {
    throw new Error("No readable text found in this document.");
  }

  const documentId = generateId("doc");
  const chunks = chunkText(cleanedText, documentId, file.originalname);

  const document: StoredDocument = {
    id: documentId,
    fileName: file.originalname,
    uploadedAt: new Date().toISOString(),
    totalChunks: chunks.length,
    chunks,
  };

  await saveDocument(document);

  return {
    id: document.id,
    fileName: document.fileName,
    totalChunks: document.totalChunks,
    uploadedAt: document.uploadedAt,
  };
}