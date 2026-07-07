import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  vector,
} from "drizzle-orm/pg-core";

import { documentStatusEnum } from "./enums";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),

  filename: text("filename").notNull(),

  mimeType: text("mime_type").notNull(),

  status: documentStatusEnum("status").default("UPLOADING").notNull(),

  storagePath: text("storage_path").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, {
      onDelete: "cascade",
    }),
  chunkIndex: integer("chunk_index").notNull(),
  pageNumber: integer("page_number"),
  content: text("content").notNull(),
  embedding: vector("embedding", {
    dimensions: 1536,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
