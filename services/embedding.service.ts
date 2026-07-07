import {
  createGoogle,
  type GoogleEmbeddingModelOptions,
} from "@ai-sdk/google";
import { embed } from "ai";

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_BATCH_SIZE = 100;

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
});

const embeddingModel = google.embedding(EMBEDDING_MODEL);

const embeddingProviderOptions = {
  google: {
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_DOCUMENT",
  } satisfies GoogleEmbeddingModelOptions,
};

export class EmbeddingService {
  private assertApiKey() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
  }

  private validateEmbedding(embedding: number[] | undefined, index: number) {
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding at index ${index}: expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}.`
      );
    }

    return embedding;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.assertApiKey();

    if (texts.length === 0) {
      return [];
    }

    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(start, start + EMBEDDING_BATCH_SIZE);
      const batchEmbeddings = await Promise.all(
        batch.map(async (text, index) => {
          const { embedding } = await embed({
            model: embeddingModel,
            value: text,
            providerOptions: embeddingProviderOptions,
          });

          return this.validateEmbedding(
            embedding,
            start + index
          );
        })
      );

      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }
}

export const embeddingService = new EmbeddingService();
