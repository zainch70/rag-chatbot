import { db } from "@/db";
import { documents } from "@/db";
import { eq } from "drizzle-orm";

type DocumentStatus = typeof documents.$inferSelect["status"];

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