import { chunkRepository } from "@/repositories/chunk.repository";

import { embeddingService } from "./embedding.service";

export class RetrievalService {
  async search(
    query: string,
    {
      limit = 5,
      documentId,
      source,
    }: {
      limit?: number;
      documentId?: string;
      source?: "system" | "user";
    } = {}
  ) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      throw new Error("Query is required.");
    }

    const queryEmbedding =
      await embeddingService.generateEmbedding(trimmedQuery);

    return chunkRepository.findSimilar(queryEmbedding, {
      limit,
      documentId,
      source,
    });
  }
}

export const retrievalService = new RetrievalService();
