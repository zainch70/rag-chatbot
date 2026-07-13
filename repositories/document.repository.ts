import { db } from "@/db";
import { documents } from "@/db";
import { and, count, eq } from "drizzle-orm";

type DocumentStatus = typeof documents.$inferSelect["status"];
type DocumentSource = typeof documents.$inferSelect["source"];

export class DocumentRepository {
  async create(data: typeof documents.$inferInsert) {
    const [document] = await db
      .insert(documents)
      .values(data)
      .returning();

    return document;
  }

  async findById(id: string) {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    return document;
  }

  async findByFilenameAndSource(
    filename: string,
    source: DocumentSource
  ) {
    const [document] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.filename, filename),
          eq(documents.source, source)
        )
      );

    return document;
  }

  async countReadyBySource(source: DocumentSource) {
    const [result] = await db
      .select({
        value: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.source, source),
          eq(documents.status, "READY")
        )
      );

    return Number(result?.value ?? 0);
  }

  async deleteById(id: string) {
    const [document] = await db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();

    return document;
  }

  async updateStatus(id: string, status: DocumentStatus) {
    const [document] = await db
      .update(documents)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return document;
  }
}

export const documentRepository = new DocumentRepository();
