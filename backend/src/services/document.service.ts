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

const MIN_READABLE_TEXT_LENGTH = 20;

export class DocumentProcessingError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DocumentProcessingError";
    this.statusCode = statusCode;
  }
}

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

async function extractTextFromPdf(filePath: string) {
  try {
    if (!pdfParse) {
      throw new DocumentProcessingError(
        "PDF parser is not available. Please upload a TXT file or try another PDF."
      );
    }

    const buffer = fs.readFileSync(filePath);

    if (!buffer || buffer.length === 0) {
      throw new DocumentProcessingError(
        "The uploaded PDF appears to be empty."
      );
    }

    const data = await pdfParse(buffer);
    const extractedText = cleanText(data.text || "");

    if (!extractedText || extractedText.length < MIN_READABLE_TEXT_LENGTH) {
      throw new DocumentProcessingError(
        "No readable text found in this PDF. It may be scanned/image-based. Please upload a text-based PDF or TXT file."
      );
    }

    return extractedText;
  } catch (error: any) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }

    const message = String(error?.message || "").toLowerCase();

    if (message.includes("password") || message.includes("encrypted")) {
      throw new DocumentProcessingError(
        "This PDF appears to be password-protected or encrypted. Please upload an unlocked PDF."
      );
    }

    if (
      message.includes("invalid") ||
      message.includes("corrupt") ||
      message.includes("bad xref") ||
      message.includes("format")
    ) {
      throw new DocumentProcessingError(
        "This PDF could not be read. It may be corrupted. Please upload another PDF or TXT file."
      );
    }

    throw new DocumentProcessingError(
      "Could not read this PDF. Please upload a text-based PDF or TXT file."
    );
  }
}

function extractTextFromTxt(filePath: string) {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    const cleaned = cleanText(text);

    if (!cleaned || cleaned.length < MIN_READABLE_TEXT_LENGTH) {
      throw new DocumentProcessingError(
        "No readable text found in this TXT file."
      );
    }

    return cleaned;
  } catch (error: any) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }

    throw new DocumentProcessingError("Could not read this TXT file.");
  }
}

function validateUploadedFile(file: Express.Multer.File) {
  if (!file) {
    throw new DocumentProcessingError("No file uploaded.");
  }

  if (!fs.existsSync(file.path)) {
    throw new DocumentProcessingError(
      "Uploaded file was not found on the server."
    );
  }

  const ext = path.extname(file.originalname).toLowerCase();

  if (![".pdf", ".txt"].includes(ext)) {
    throw new DocumentProcessingError(
      "Unsupported file type. Please upload only a PDF or TXT file."
    );
  }

  if (file.size === 0) {
    throw new DocumentProcessingError("The uploaded file is empty.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new DocumentProcessingError(
      "File is too large. Please upload a PDF or TXT file under 12MB."
    );
  }

  return ext;
}

export async function processUploadedDocument(
  file: Express.Multer.File,
  userEmail: string
) {
  try {
    const ext = validateUploadedFile(file);

    let extractedText = "";

    if (ext === ".pdf") {
      extractedText = await extractTextFromPdf(file.path);
    } else if (ext === ".txt") {
      extractedText = extractTextFromTxt(file.path);
    }

    const cleanedText = cleanText(extractedText);

    if (!cleanedText || cleanedText.length < MIN_READABLE_TEXT_LENGTH) {
      throw new DocumentProcessingError(
        "No readable text found in this document. Please upload a text-based PDF or TXT file."
      );
    }

    const documentId = generateId("doc");
    const chunks = createSmartChunks(
      cleanedText,
      documentId,
      file.originalname
    );

    if (chunks.length === 0) {
      throw new DocumentProcessingError(
        "Could not create searchable chunks from this document."
      );
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
  } finally {
    deleteTempFile(file?.path);
  }
}