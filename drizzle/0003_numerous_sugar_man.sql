CREATE TYPE "public"."document_source" AS ENUM('system', 'user');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "source" "document_source" DEFAULT 'user' NOT NULL;