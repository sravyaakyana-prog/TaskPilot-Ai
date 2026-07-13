import { UploadedDocumentModel } from "../models/document.model";
import { GUEST_USER_EMAIL } from "../utils/currentUser";

export type DocumentChunk = {
  id: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
};

export type StoredDocument = {
  id: string;
  userEmail?: string;
  fileName: string;
  uploadedAt: string;
  totalChunks: number;
  chunks: DocumentChunk[];
};

export type DocumentSearchResult = {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  score: number;
};

function normalizeDocument(document: any): StoredDocument {
  return {
    id: document.id,
    userEmail: document.userEmail || GUEST_USER_EMAIL,
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
    totalChunks: document.totalChunks,
    chunks: document.chunks || [],
  };
}

function userFilter(userEmail: string) {
  return {
    $or: [
      { userEmail },
      {
        userEmail: {
          $exists: false,
        },
      },
    ],
  };
}

function scoreChunk(query: string, text: string) {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const lowerText = text.toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    if (lowerText.includes(term)) {
      score += 1;
    }
  }

  if (lowerText.includes(query.toLowerCase())) {
    score += 3;
  }

  return score;
}

export async function saveDocument(
  document: StoredDocument,
  userEmail = GUEST_USER_EMAIL
) {
  const documentToSave = {
    ...document,
    userEmail: userEmail || GUEST_USER_EMAIL,
  };

  await UploadedDocumentModel.findOneAndUpdate(
    {
      id: document.id,
    },
    documentToSave,
    {
      upsert: true,
      new: true,
    }
  );

  return normalizeDocument(documentToSave);
}

export async function getDocuments(userEmail = GUEST_USER_EMAIL) {
  const documents = await UploadedDocumentModel.find(
    userFilter(userEmail || GUEST_USER_EMAIL)
  )
    .sort({ createdAt: -1 })
    .lean();

  return documents.map(normalizeDocument);
}

export async function getDocumentById(
  documentId: string,
  userEmail = GUEST_USER_EMAIL
) {
  const document = await UploadedDocumentModel.findOne({
    id: documentId,
    ...userFilter(userEmail || GUEST_USER_EMAIL),
  }).lean();

  if (!document) {
    return null;
  }

  return normalizeDocument(document);
}

export async function getAllChunks(userEmail = GUEST_USER_EMAIL) {
  const documents = await getDocuments(userEmail);

  return documents.flatMap((document) => document.chunks);
}

export async function searchDocuments(
  query: string,
  userEmail = GUEST_USER_EMAIL
) {
  const documents = await getDocuments(userEmail);

  const results: DocumentSearchResult[] = [];

  for (const document of documents) {
    for (const chunk of document.chunks) {
      const score = scoreChunk(query, chunk.text);

      if (score > 0) {
        results.push({
          documentId: document.id,
          fileName: document.fileName,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          score,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}