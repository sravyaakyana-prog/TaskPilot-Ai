import mongoose, { Schema } from "mongoose";

const DocumentChunkSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const UploadedDocumentSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      default: "guest@taskpilot.local",
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: String,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    chunks: {
      type: [DocumentChunkSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

UploadedDocumentSchema.index({ userEmail: 1, createdAt: -1 });
UploadedDocumentSchema.index({ userEmail: 1, "chunks.text": "text" });

export const UploadedDocumentModel =
  mongoose.models.UploadedDocument ||
  mongoose.model(
    "UploadedDocument",
    UploadedDocumentSchema,
    "uploaded_documents"
  );