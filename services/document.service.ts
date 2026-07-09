import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { documentRepository } from "@/repositories/document.repository";
import {
  PdfValidationError,
  validatePdfBuffer,
  validatePdfMetadata,
} from "@/lib/validate-pdf-upload";

export class DocumentService {
  async upload(file: File) {
    if (!file) {
      throw new PdfValidationError("No file uploaded.");
    }

    validatePdfMetadata(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    validatePdfBuffer(buffer);

    const documentId = randomUUID();
    const extension = path.extname(file.name).toLowerCase() || ".pdf";
    const uploadsDirectory = path.join(process.cwd(), "uploads");

    await mkdir(uploadsDirectory, {
      recursive: true,
    });

    const storageFilename = `${documentId}${extension}`;

    const storagePath = path.join(
      uploadsDirectory,
      storageFilename
    );

    await writeFile(storagePath, buffer);

    // Save document metadata
    const document =
      await documentRepository.create({
        id: documentId,
        title: path.parse(file.name).name,
        filename: file.name,
        storagePath,
        mimeType: file.type || "application/pdf",

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