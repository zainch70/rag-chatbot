import { documentProcessorService } from "./document-processor.service";
import { textChunkerService } from "./text-chunker.service";

import { chunkRepository } from "@/repositories/chunk.repository";
import { documentService } from "./document.service";

export class IngestionService {
  async process(document: {
    id: string;
    storagePath: string;
  }) {
    try {
      console.log("\n========== INGESTION START ==========");
      console.log("Document ID:", document.id);

      console.log("1️⃣ Updating status -> PROCESSING");
      await documentService.updateStatus(
        document.id,
        "PROCESSING"
      );
      console.log("✅ Status updated");

      console.log("2️⃣ Extracting text from PDF");
      const extracted =
        await documentProcessorService.extractText(
          document.storagePath
        );

      console.log(
        `✅ Text extracted (${extracted.text.length} characters)`
      );

      console.log("3️⃣ Chunking text");
      const chunks =
        textChunkerService.chunk(extracted.text);

      console.log(`✅ ${chunks.length} chunks created`);

      console.log("First chunk preview:");
      console.log(chunks[0]?.content.slice(0, 150));

      console.log("4️⃣ Saving chunks to database");

      const savedChunks =
        await chunkRepository.createMany(
          chunks.map((chunk) => ({
            documentId: document.id,
            chunkIndex: chunk.index,
            content: chunk.content,
          }))
        );

      console.log(
        `✅ ${savedChunks.length} chunks saved`
      );

      console.log("5️⃣ Updating status -> READY");

      await documentService.updateStatus(
        document.id,
        "READY"
      );

      console.log("✅ Document marked READY");
      console.log("========== INGESTION COMPLETE ==========\n");

      return savedChunks;
    } catch (error) {
      console.error("\n========== INGESTION FAILED ==========");

      if (error instanceof Error) {
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
      } else {
        console.error(error);
      }

      try {
        await documentService.updateStatus(
          document.id,
          "FAILED"
        );
      } catch (statusError) {
        console.error(
          "Failed to update document status:",
          statusError
        );
      }

      console.error("=======================================\n");

      throw error;
    }
  }
}

export const ingestionService =
  new IngestionService();