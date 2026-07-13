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

function splitIntoParagraphs(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((item) => cleanText(item))
    .filter((item) => item.length > 20);
}

function createSmartChunks(
  text: string,
  documentId: string,
  fileName: string
): DocumentChunk[] {
  const cleaned = cleanText(text);
  const paragraphs = splitIntoParagraphs(cleaned);

  const chunkSize = 1200;
  const overlapSize = 180;

  const chunks: DocumentChunk[] = [];

  let currentChunk = "";
  let chunkIndex = 0;

  function pushChunk(value: string) {
    const chunkText = cleanText(value);

    if (!chunkText || chunkText.length < 30) return;

    chunks.push({
      id: generateId("chunk"),
      documentId,
      fileName,
      chunkIndex,
      text: chunkText,
    });

    chunkIndex++;
  }

  for (const paragraph of paragraphs) {
    if ((currentChunk + " " + paragraph).length <= chunkSize) {
      currentChunk = `${currentChunk} ${paragraph}`.trim();
    } else {
      pushChunk(currentChunk);

      const overlap = currentChunk.slice(-overlapSize);
      currentChunk = `${overlap} ${paragraph}`.trim();

      if (currentChunk.length > chunkSize * 1.4) {
        pushChunk(currentChunk.slice(0, chunkSize));
        currentChunk = currentChunk.slice(chunkSize - overlapSize);
      }
    }
  }

  pushChunk(currentChunk);

  if (chunks.length === 0 && cleaned.length > 0) {
    let start = 0;

    while (start < cleaned.length) {
      const end = Math.min(start + chunkSize, cleaned.length);
      const chunkText = cleaned.slice(start, end).trim();

      if (chunkText.length > 0) {
        chunks.push({
          id: generateId("chunk"),
          documentId,
          fileName,
          chunkIndex,
          text: chunkText,
        });

        chunkIndex++;
      }

      start += chunkSize - overlapSize;
    }
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
  const chunks = createSmartChunks(cleanedText, documentId, file.originalname);

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