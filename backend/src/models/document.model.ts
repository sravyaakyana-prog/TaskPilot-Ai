import mongoose, { Schema } from "mongoose";

const DocumentChunkSchema = new Schema(
  {
    id: { type: String, required: true },
    documentId: { type: String, required: true },
    fileName: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const UploadedDocumentSchema = new Schema(
  {
    documentId: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: String, required: true },
    totalChunks: { type: Number, required: true },
    chunks: [DocumentChunkSchema],
  },
  {
    collection: "uploaded_documents",
  }
);

export const UploadedDocumentModel =
  mongoose.models.UploadedDocument ||
  mongoose.model("UploadedDocument", UploadedDocumentSchema);