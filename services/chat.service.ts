import { createGoogle } from "@ai-sdk/google";
import { streamText } from "ai";

import { buildRagPrompt } from "@/lib/prompts";

import { retrievalService } from "./retrieval.service";

const CHAT_MODEL = "gemini-2.5-flash";
const DEFAULT_RETRIEVAL_LIMIT = 5;

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
});

export class ChatService {
  private assertApiKey() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
  }

  async streamAnswer(
    message: string,
    {
      limit = DEFAULT_RETRIEVAL_LIMIT,
      documentId,
    }: {
      limit?: number;
      documentId?: string;
    } = {}
  ) {
    this.assertApiKey();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      throw new Error("Message is required.");
    }

    const sources = await retrievalService.search(trimmedMessage, {
      limit,
      documentId,
    });

    const prompt = buildRagPrompt({
      question: trimmedMessage,
      sources,
    });

    return streamText({
      model: google(CHAT_MODEL),
      prompt,
    });
  }
}

export const chatService = new ChatService();
