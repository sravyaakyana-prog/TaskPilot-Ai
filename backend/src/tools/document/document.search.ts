import { DocumentChunk, getAllChunks, getAllDocuments } from "../../database/documentStore";

const STOP_WORDS = new Set([
  "the",
  "is",
  "are",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "this",
  "that",
  "what",
  "how",
  "does",
  "do",
  "from",
  "according",
  "document",
  "uploaded",
]);

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreChunk(questionTokens: string[], chunk: DocumentChunk) {
  const chunkText = chunk.text.toLowerCase();

  let score = 0;

  for (const token of questionTokens) {
    if (chunkText.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function getTopChunks(question: string, limit = 3) {
  const chunks = getAllChunks();
  const questionTokens = tokenize(question);

  if (chunks.length === 0) {
    return [];
  }

  if (questionTokens.length === 0) {
    return chunks.slice(0, limit);
  }

  return chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(questionTokens, chunk),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.chunk);
}

function summarizeLatestDocument() {
  const documents = getAllDocuments();

  if (documents.length === 0) {
    return null;
  }

  const latestDocument = documents[documents.length - 1];
  const firstChunks = latestDocument.chunks.slice(0, 3);

  const context = firstChunks.map((chunk) => chunk.text).join(" ");

  return {
    fileName: latestDocument.fileName,
    totalChunks: latestDocument.totalChunks,
    summaryText: cleanText(context).slice(0, 1200),
  };
}

function buildAnswer(question: string, chunks: DocumentChunk[]) {
  const context = chunks.map((chunk) => chunk.text).join(" ");

  const cleanedContext = cleanText(context);

  return `📄 Document Answer

Question:
${question}

Answer:
Based on the uploaded document, the most relevant information is:

${cleanedContext.slice(0, 1400)}

Sources:
${chunks
  .map(
    (chunk) =>
      `- ${chunk.fileName}, chunk ${chunk.chunkIndex + 1}`
  )
  .join("\n")}

Note:
This is a local keyword-based RAG prototype. Next, we can upgrade it with embeddings for better semantic search.`;
}

export async function searchDocuments(question: string): Promise<string> {
  const documents = getAllDocuments();

  if (documents.length === 0) {
    return `📄 Document Q&A

No documents are uploaded yet.

Upload a PDF or TXT file first, then ask a question about it.`;
  }

  const lowerQuestion = question.toLowerCase();

  const wantsSummary =
    lowerQuestion.includes("summarize") ||
    lowerQuestion.includes("summary") ||
    lowerQuestion.includes("what is this document about") ||
    lowerQuestion.includes("what is the document about");

  if (wantsSummary) {
    const summary = summarizeLatestDocument();

    if (!summary) {
      return `📄 Document Q&A

No readable document content found.`;
    }

    return `📄 Document Summary

File:
${summary.fileName}

Total Chunks:
${summary.totalChunks}

Summary:
${summary.summaryText}

Note:
This summary is generated from the extracted document text.`;
  }

  const topChunks = getTopChunks(question);

  if (topChunks.length === 0) {
    return `📄 Document Answer

I could not find a strong match in the uploaded documents for:

${question}

Try asking with keywords that appear in the document.`;
  }

  return buildAnswer(question, topChunks);
}