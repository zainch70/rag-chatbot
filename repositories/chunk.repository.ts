import { db } from "@/db";
import { documentChunks } from "@/db";

import { sql } from "drizzle-orm";

import type { InferInsertModel } from "drizzle-orm";

type SimilarChunkRow = {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export class ChunkRepository {
  async createMany(
    chunks: InferInsertModel<typeof documentChunks>[]
  ) {
    return db
      .insert(documentChunks)
      .values(chunks)
      .returning();
  }

  async findByDocumentId(documentId: string) {
    return db.query.documentChunks.findMany({
      where: (chunk, { eq }) =>
        eq(chunk.documentId, documentId),
      orderBy: (chunk, { asc }) =>
        asc(chunk.chunkIndex),
    });
  }

  async findSimilar(
    embedding: number[],
    {
      limit = 5,
      documentId,
    }: {
      limit?: number;
      documentId?: string;
    } = {}
  ) {
    const embeddingVector = `[${embedding.join(",")}]`;
    const filters = [
      sql`${documentChunks.embedding} IS NOT NULL`,
    ];

    if (documentId) {
      filters.push(sql`${documentChunks.documentId} = ${documentId}`);
    }

    const whereClause = filters.reduce((accumulator, filter, index) => {
      if (index === 0) {
        return filter;
      }

      return sql`${accumulator} AND ${filter}`;
    });

    const similarity = sql<number>`
      1 - (${documentChunks.embedding} <=> ${embeddingVector}::vector)
    `;

    const result = await db.execute(sql<SimilarChunkRow>`
      SELECT
        ${documentChunks.id} AS "id",
        ${documentChunks.documentId} AS "documentId",
        ${documentChunks.chunkIndex} AS "chunkIndex",
        ${documentChunks.pageNumber} AS "pageNumber",
        ${documentChunks.content} AS "content",
        ${similarity} AS "similarity"
      FROM ${documentChunks}
      WHERE ${whereClause}
      ORDER BY ${documentChunks.embedding} <=> ${embeddingVector}::vector
      LIMIT ${limit};
    `);

    return result as unknown as SimilarChunkRow[];
  }
}

export const chunkRepository =
  new ChunkRepository();