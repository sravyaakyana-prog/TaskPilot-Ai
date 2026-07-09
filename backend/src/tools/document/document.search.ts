import {
  DocumentChunk,
  getAllChunks,
  getAllDocuments,
} from "../../database/documentStore";

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
  "please",
  "tell",
  "me",
  "about",
]);

const SYNONYMS: Record<string, string[]> = {
  tools: ["gmail", "calendar", "documents", "rag", "email", "draft", "meeting"],
  support: ["supports", "features", "capabilities", "can"],
  email: ["gmail", "inbox", "draft", "emails"],
  meeting: ["calendar", "event", "schedule", "meetings"],
  document: ["rag", "pdf", "file", "documents"],
  project: ["taskpilot", "agent", "productivity"],
};

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

function expandTokens(tokens: string[]) {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);

    const synonyms = SYNONYMS[token];

    if (synonyms) {
      synonyms.forEach((item) => expanded.add(item));
    }
  }

  return Array.from(expanded);
}

function splitIntoSentences(text: string) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
}

function scoreText(tokens: string[], text: string) {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lowerText.includes(token)) {
      score += 2;
    }

    const exactWordRegex = new RegExp(`\\b${token}\\b`, "i");

    if (exactWordRegex.test(lowerText)) {
      score += 3;
    }
  }

  return score;
}

function scoreChunk(questionTokens: string[], chunk: DocumentChunk) {
  const baseScore = scoreText(questionTokens, chunk.text);
  const earlyChunkBoost = chunk.chunkIndex === 0 ? 2 : 0;

  return baseScore + earlyChunkBoost;
}

async function getTopChunks(question: string, limit = 4) {
  const chunks = await getAllChunks();
  const rawTokens = tokenize(question);
  const questionTokens = expandTokens(rawTokens);

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

function getRelevantSentences(question: string, chunks: DocumentChunk[], limit = 5) {
  const rawTokens = tokenize(question);
  const questionTokens = expandTokens(rawTokens);

  const sentenceScores = chunks.flatMap((chunk) => {
    const sentences = splitIntoSentences(chunk.text);

    return sentences.map((sentence) => ({
      sentence,
      chunk,
      score: scoreText(questionTokens, sentence),
    }));
  });

  const rankedSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit);

  if (rankedSentences.length === 0) {
    return chunks.slice(0, 2).map((chunk) => ({
      sentence: cleanText(chunk.text).slice(0, 500),
      chunk,
      score: 1,
    }));
  }

  return rankedSentences;
}

async function summarizeLatestDocument() {
  const documents = await getAllDocuments();

  if (documents.length === 0) {
    return null;
  }

  const latestDocument = documents[0];
  const firstChunks = latestDocument.chunks.slice(0, 4);

  const context = cleanText(firstChunks.map((chunk) => chunk.text).join(" "));
  const sentences = splitIntoSentences(context);

  const summarySentences = sentences.slice(0, 5);

  return {
    fileName: latestDocument.fileName,
    totalChunks: latestDocument.totalChunks,
    summaryText:
      summarySentences.length > 0
        ? summarySentences.join(" ")
        : context.slice(0, 1200),
  };
}

function buildAnswer(question: string, chunks: DocumentChunk[]) {
  const relevantSentences = getRelevantSentences(question, chunks);

  const answerText = relevantSentences
    .map((item) => `- ${item.sentence}`)
    .join("\n");

  const uniqueSources = Array.from(
    new Map(
      relevantSentences.map((item) => [
        `${item.chunk.fileName}-${item.chunk.chunkIndex}`,
        item.chunk,
      ])
    ).values()
  );

  return `📄 Document Answer

Question:
${question}

Answer:
Based on the uploaded document, I found these relevant points:

${answerText}

Sources:
${uniqueSources
  .map((chunk) => `- ${chunk.fileName}, chunk ${chunk.chunkIndex + 1}`)
  .join("\n")}

RAG Mode:
MongoDB document chunks + local sentence ranking.

Note:
This answer is grounded in uploaded document chunks.`;
}

export async function searchDocuments(question: string): Promise<string> {
  const documents = await getAllDocuments();

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
    const summary = await summarizeLatestDocument();

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

Sources:
- ${summary.fileName}

RAG Mode:
MongoDB latest document summary.`;
  }

  const topChunks = await getTopChunks(question);

  if (topChunks.length === 0) {
    return `📄 Document Answer

I could not find a strong match in the uploaded documents for:

${question}

Try asking with keywords that appear in the document.

Available Documents:
${documents
  .map((document) => `- ${document.fileName} (${document.totalChunks} chunks)`)
  .join("\n")}`;
  }

  return buildAnswer(question, topChunks);
}