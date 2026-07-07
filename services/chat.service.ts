import { GoogleGenAI } from "@google/genai";

import { buildRagPrompt } from "@/lib/prompts";

import { retrievalService } from "./retrieval.service";

const CHAT_MODEL = "gemini-2.5-flash";
const DEFAULT_RETRIEVAL_LIMIT = 5;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export class ChatService {
  private assertApiKey() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
  }

  async answer(
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

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
    });

    const answer = response.text?.trim();

    if (!answer) {
      throw new Error("Chat model returned an empty response.");
    }

    return {
      answer,
      sources,
    };
  }
}

export const chatService = new ChatService();
