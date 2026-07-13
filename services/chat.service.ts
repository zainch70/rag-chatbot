import { createGoogle } from "@ai-sdk/google";
import { streamText } from "ai";

import { buildRagPrompt } from "@/lib/prompts";

import { documentRepository } from "@/repositories/document.repository";

import { retrievalService } from "./retrieval.service";

const CHAT_MODEL = "gemini-2.5-flash";
const DEFAULT_RETRIEVAL_LIMIT = 5;
const MIN_RELEVANT_SIMILARITY = 0.55;
const MAX_SIMILARITY_DROP_FROM_TOP = 0.08;

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
});

export class ChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatRequestError";
  }
}

export class ChatService {
  private filterRelevantSources<
    T extends {
      similarity: number;
    },
  >(sources: T[]) {
    if (sources.length === 0) {
      return [];
    }

    const topSimilarity = sources[0].similarity;

    if (topSimilarity < MIN_RELEVANT_SIMILARITY) {
      return [];
    }

    return sources.filter(
      (source) =>
        source.similarity >= MIN_RELEVANT_SIMILARITY &&
        topSimilarity - source.similarity <= MAX_SIMILARITY_DROP_FROM_TOP
    );
  }

  private assertApiKey() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
  }

  async streamAnswer(
    message: string,
    {
      limit = DEFAULT_RETRIEVAL_LIMIT,
    }: {
      limit?: number;
    } = {}
  ) {
    this.assertApiKey();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      throw new ChatRequestError("Message is required.");
    }

    const readySystemDocuments =
      await documentRepository.countReadyBySource("system");

    if (readySystemDocuments === 0) {
      throw new ChatRequestError(
        "Company knowledge is not ready yet. Ask an admin to add PDFs to the knowledge folder and run the seed command."
      );
    }

    const sources = await retrievalService.search(trimmedMessage, {
      limit,
      source: "system",
    });
    const relevantSources = this.filterRelevantSources(sources);

    const prompt = buildRagPrompt({
      question: trimmedMessage,
      sources: relevantSources,
    });

    return streamText({
      model: google(CHAT_MODEL),
      prompt,
    });
  }
}

export const chatService = new ChatService();
