import { chunkRepository } from "@/repositories/chunk.repository";

import { embeddingService } from "./embedding.service";

export class RetrievalService {
  async search(
    query: string,
    {
      limit = 5,
      documentId,
    }: {
      limit?: number;
      documentId?: string;
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
    });
  }
}

export const retrievalService = new RetrievalService();
