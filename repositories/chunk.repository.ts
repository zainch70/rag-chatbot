import { db } from "@/db";
import { documentChunks } from "@/db";

import type { InferInsertModel } from "drizzle-orm";

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
}

export const chunkRepository =
  new ChunkRepository();