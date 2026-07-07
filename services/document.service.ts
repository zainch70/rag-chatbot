import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { documentRepository } from "@/repositories/document.repository";

export class DocumentService {
  async upload(file: File) {
    // Validate file
    if (!file) {
      throw new Error("No file uploaded.");
    }

    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are allowed.");
    }

    // Generate unique document id
    const documentId = randomUUID();

    // Storage information
    const extension = path.extname(file.name);
    const uploadsDirectory = path.join(process.cwd(), "uploads");

    await mkdir(uploadsDirectory, {
      recursive: true,
    });

    const storageFilename = `${documentId}${extension}`;

    const storagePath = path.join(
      uploadsDirectory,
      storageFilename
    );

    // Save PDF locally
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(storagePath, buffer);

    // Save document metadata
    const document =
      await documentRepository.create({
        id: documentId,
        title: path.parse(file.name).name,
        filename: file.name,
        storagePath,
        mimeType: file.type,

        // Upload completed.
        // Next step is processing the document.
        status: "PROCESSING",
      });

    return document;
  }

  async updateStatus(
    documentId: string,
    status:
      | "UPLOADING"
      | "PROCESSING"
      | "READY"
      | "FAILED"
  ) {
    return documentRepository.updateStatus(
      documentId,
      status
    );
  }
}

export const documentService =
  new DocumentService();