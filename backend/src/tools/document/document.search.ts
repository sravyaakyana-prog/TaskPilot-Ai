import {
  DocumentChunk,
  getDocuments,
  StoredDocument,
} from "../../database/documentStore";
import { generateAIResponse } from "../../services/llm.service";
import { getCurrentUserEmail } from "../../utils/currentUser";

type RankedChunk = {
  chunk: DocumentChunk;
  score: number;
  reasons: string[];
};

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
  "summarize",
  "summarise",
  "summary",
  "explain",
  "file",
  "pdf",
  "it",
  "give",
  "show",
  "main",
  "key",
]);

const SYNONYMS: Record<string, string[]> = {
  tools: ["gmail", "calendar", "documents", "rag", "email", "draft", "meeting"],
  support: ["supports", "features", "capabilities", "can"],
  email: ["gmail", "inbox", "draft", "emails", "mail"],
  meeting: ["calendar", "event", "schedule", "meetings"],
  document: ["rag", "pdf", "file", "documents"],
  project: ["taskpilot", "agent", "productivity", "assistant"],
  ai: ["agent", "assistant", "automation", "taskpilot"],
  resume: ["cv", "profile", "career", "skills"],
  internship: ["intern", "job", "role", "application"],
};

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
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

function getQuestionTokens(question: string) {
  return expandTokens(tokenize(question));
}

function getExactPhrases(question: string) {
  const cleaned = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((word) => word.length > 2);
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases.filter((phrase) =>
    phrase.split(" ").some((word) => !STOP_WORDS.has(word))
  );
}

function splitIntoSentences(text: string) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function countOccurrences(text: string, token: string) {
  const matches = text.match(new RegExp(`\\b${token}\\b`, "gi"));
  return matches ? matches.length : 0;
}

function scoreChunk(question: string, chunk: DocumentChunk): RankedChunk {
  const tokens = getQuestionTokens(question);
  const phrases = getExactPhrases(question);
  const lowerText = chunk.text.toLowerCase();
  const lowerFileName = chunk.fileName.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  for (const token of tokens) {
    if (lowerText.includes(token)) {
      const occurrences = countOccurrences(lowerText, token);
      score += 2 + Math.min(occurrences, 5);
      reasons.push(`matched keyword "${token}"`);
    }

    if (lowerFileName.includes(token)) {
      score += 3;
      reasons.push(`matched filename "${token}"`);
    }
  }

  for (const phrase of phrases) {
    if (lowerText.includes(phrase)) {
      score += 8;
      reasons.push(`matched phrase "${phrase}"`);
    }
  }

  if (chunk.chunkIndex === 0) {
    score += 2;
    reasons.push("intro chunk boost");
  }

  if (chunk.text.length > 300 && chunk.text.length < 1800) {
    score += 1;
  }

  return {
    chunk,
    score,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function isSummaryQuery(question: string) {
  const lowerQuestion = question.toLowerCase();

  return (
    lowerQuestion.includes("summarize") ||
    lowerQuestion.includes("summarise") ||
    lowerQuestion.includes("summary") ||
    lowerQuestion.includes("what is this document about") ||
    lowerQuestion.includes("what is the document about") ||
    lowerQuestion.includes("what is it about") ||
    lowerQuestion.includes("what does this document say") ||
    lowerQuestion.includes("what does it say") ||
    lowerQuestion.includes("explain this document") ||
    lowerQuestion.includes("explain it") ||
    lowerQuestion.trim() === "summarize it"
  );
}

function getLatestDocument(documents: StoredDocument[]) {
  return [...documents].sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0];
}

function getAllDocumentChunks(documents: StoredDocument[]) {
  return documents.flatMap((document) => document.chunks || []);
}

function rankChunks(question: string, documents: StoredDocument[], limit = 6) {
  const chunks = getAllDocumentChunks(documents);

  if (chunks.length === 0) {
    return [];
  }

  const ranked = chunks
    .map((chunk) => scoreChunk(question, chunk))
    .sort((a, b) => b.score - a.score);

  const positiveMatches = ranked.filter((item) => item.score > 0);

  if (positiveMatches.length > 0) {
    return positiveMatches.slice(0, limit);
  }

  const latestDocument = getLatestDocument(documents);

  return latestDocument.chunks.slice(0, limit).map((chunk, index) => ({
    chunk,
    score: limit - index,
    reasons: ["fallback latest document chunk"],
  }));
}

function getSummaryChunks(documents: StoredDocument[], limit = 6) {
  const latestDocument = getLatestDocument(documents);

  return latestDocument.chunks.slice(0, limit).map((chunk, index) => ({
    chunk,
    score: limit - index,
    reasons: ["latest document summary context"],
  }));
}

function buildContextFromRankedChunks(rankedChunks: RankedChunk[]) {
  return rankedChunks
    .map((item, index) => {
      return `SOURCE ${index + 1}
File: ${item.chunk.fileName}
Chunk: ${item.chunk.chunkIndex + 1}
Score: ${item.score}
Text:
${cleanText(item.chunk.text)}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 6000);
}

function localExtractiveAnswer(question: string, rankedChunks: RankedChunk[]) {
  const tokens = getQuestionTokens(question);

  const sentenceScores = rankedChunks.flatMap((item) => {
    const sentences = splitIntoSentences(item.chunk.text);

    return sentences.map((sentence) => {
      const lowerSentence = sentence.toLowerCase();

      let score = item.score * 0.2;

      for (const token of tokens) {
        if (lowerSentence.includes(token)) {
          score += 4;
        }
      }

      return {
        sentence,
        chunk: item.chunk,
        score,
      };
    });
  });

  const rankedSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .filter((item) => item.sentence.length > 20);

  if (rankedSentences.length === 0) {
    return rankedChunks
      .slice(0, 3)
      .map((item) => `- ${cleanText(item.chunk.text).slice(0, 500)}`)
      .join("\n");
  }

  return rankedSentences
    .map((item) => `- ${item.sentence}`)
    .join("\n");
}

function buildSources(rankedChunks: RankedChunk[]) {
  const uniqueChunks = Array.from(
    new Map(
      rankedChunks.map((item) => [
        `${item.chunk.documentId}-${item.chunk.chunkIndex}`,
        item,
      ])
    ).values()
  );

  return uniqueChunks.slice(0, 5).map((item) => ({
    documentId: item.chunk.documentId,
    fileName: item.chunk.fileName,
    chunkIndex: item.chunk.chunkIndex,
    text: item.chunk.text,
    score: item.score,
    reasons: item.reasons,
  }));
}

async function generateGroundedAnswer(params: {
  question: string;
  context: string;
  isSummary: boolean;
  userEmail: string;
}) {
  const instruction = params.isSummary
    ? `Summarize the uploaded document using only the provided context.
Give:
1. Short overview
2. Key points
3. What the document is mainly about`
    : `Answer the user's question using only the provided document context.
If the answer is not present in the context, say that it is not clearly available in the uploaded document.
Give a clear answer with bullet points when useful.`;

  const result = await generateAIResponse({
    message: `${instruction}

User question:
${params.question}`,
    intent: "DOCUMENT_QA",
    userEmail: params.userEmail,
    context: params.context,
  });

  return result;
}

export async function searchDocumentTool(question: string) {
  const userEmail = getCurrentUserEmail();
  const documents = await getDocuments(userEmail);

  if (documents.length === 0) {
    return {
      success: true,
      userEmail,
      message:
        "No documents are uploaded yet. Upload a PDF or TXT file first, then ask a question about it.",
      answer:
        "No uploaded documents found. Please upload a PDF or TXT file first.",
      results: [],
      mode: "NO_DOCUMENTS",
    };
  }

  const summaryQuery = isSummaryQuery(question);

  const rankedChunks = summaryQuery
    ? getSummaryChunks(documents, 6)
    : rankChunks(question, documents, 6);

  if (rankedChunks.length === 0) {
    return {
      success: true,
      userEmail,
      message: "No readable chunks found in your uploaded documents.",
      answer:
        "I could not find readable chunks in your uploaded documents. Please upload a text-based PDF or TXT file.",
      results: [],
      mode: "NO_CHUNKS",
    };
  }

  const context = buildContextFromRankedChunks(rankedChunks);
  const localAnswer = localExtractiveAnswer(question, rankedChunks);
  const sources = buildSources(rankedChunks);

  let finalAnswer = "";
  let provider = "local";
  let usedFallback = false;

  try {
    const llmResult = await generateGroundedAnswer({
      question,
      context,
      isSummary: summaryQuery,
      userEmail,
    });

    if (llmResult.usedFallback) {
      finalAnswer = localAnswer;
      provider = "local-fallback";
      usedFallback = true;
    } else {
      finalAnswer = llmResult.text;
      provider = llmResult.provider;
      usedFallback = false;
    }
  } catch {
    finalAnswer = localAnswer;
    provider = "local-fallback";
    usedFallback = true;
  }

  return {
    success: true,
    userEmail,
    message: summaryQuery
      ? "Document summary generated successfully."
      : `Found ${sources.length} relevant document source(s).`,
    answer: `${finalAnswer}

Sources:
${sources
  .map((source) => `- ${source.fileName}, chunk ${source.chunkIndex + 1}`)
  .join("\n")}

RAG Mode:
Hybrid MongoDB chunk retrieval + Gemini grounded answer.

Provider:
${provider}${usedFallback ? " fallback" : ""}`,
    results: sources,
    mode: summaryQuery ? "DOCUMENT_SUMMARY" : "DOCUMENT_QA",
  };
}

export async function searchDocuments(question: string): Promise<string> {
  const result = await searchDocumentTool(question);

  if (result.answer) {
    return `📄 Document Answer

Question:
${question}

Answer:
${result.answer}`;
  }

  return result.message || "No document answer found.";
}

export const documentSearchTool = searchDocumentTool;

export default searchDocumentTool;