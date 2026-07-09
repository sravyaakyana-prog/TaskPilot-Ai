import { UploadedDocumentModel } from "../models/document.model";

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

function toClientDocument(document: any): StoredDocument {
  return {
    id: document.documentId || document._id.toString(),
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
    totalChunks: document.totalChunks,
    chunks: (document.chunks || []).map((chunk: any) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
    })),
  };
}

export async function saveDocument(document: StoredDocument) {
  const createdDocument = await UploadedDocumentModel.create({
    documentId: document.id,
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
    totalChunks: document.totalChunks,
    chunks: document.chunks,
  });

  return toClientDocument(createdDocument.toObject());
}

export async function getAllDocuments() {
  const documents = await UploadedDocumentModel.find()
    .sort({ uploadedAt: -1 })
    .lean();

  return documents.map(toClientDocument);
}

export async function getAllChunks() {
  const documents = await getAllDocuments();

  return documents.flatMap((document) => document.chunks);
}

export async function clearDocuments() {
  await UploadedDocumentModel.deleteMany({});
}