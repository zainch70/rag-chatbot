import { pgEnum } from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", [
  "UPLOADING",
  "PROCESSING",
  "READY",
  "FAILED",
]);

export const documentSourceEnum = pgEnum("document_source", [
  "system",
  "user",
]);