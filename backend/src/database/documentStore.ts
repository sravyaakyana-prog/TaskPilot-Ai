import fs from "fs";
import path from "path";

export type DocumentChunk = {
  id: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
};

export type StoredDocument = {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalChunks: number;
  chunks: DocumentChunk[];
};

const DOCUMENT_DIR = path.resolve(process.cwd(), "storage", "documents");
const DOCUMENT_STORE_FILE = path.join(DOCUMENT_DIR, "documents.json");

function ensureDocumentDir() {
  if (!fs.existsSync(DOCUMENT_DIR)) {
    fs.mkdirSync(DOCUMENT_DIR, { recursive: true });
  }
}

function readStore(): StoredDocument[] {
  ensureDocumentDir();

  if (!fs.existsSync(DOCUMENT_STORE_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(DOCUMENT_STORE_FILE, "utf-8");
    return JSON.parse(raw) as StoredDocument[];
  } catch {
    return [];
  }
}

function writeStore(documents: StoredDocument[]) {
  ensureDocumentDir();
  fs.writeFileSync(DOCUMENT_STORE_FILE, JSON.stringify(documents, null, 2), "utf-8");
}

export function saveDocument(document: StoredDocument) {
  const documents = readStore();
  documents.push(document);
  writeStore(documents);
  return document;
}

export function getAllDocuments() {
  return readStore();
}

export function getAllChunks() {
  return readStore().flatMap((document) => document.chunks);
}

export function clearDocuments() {
  writeStore([]);
}