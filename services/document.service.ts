//this file just marked ready or failed after the ingestion service has processed the document. It does not handle the actual ingestion of the document. The ingestion service handles that.
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { documentRepository } from "@/repositories/document.repository";
import {
  getLocalUploadsDirectory,
  isServerlessRuntime,
} from "@/lib/runtime-storage";
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
    const storageFilename = `${documentId}${extension}`;
    const useServerlessStorage = isServerlessRuntime();

    let storagePath: string;

    if (useServerlessStorage) {
      storagePath = `memory://${storageFilename}`;
    } else {
      const uploadsDirectory = getLocalUploadsDirectory();

      await mkdir(uploadsDirectory, {
        recursive: true,
      });

      storagePath = path.join(uploadsDirectory, storageFilename);
      await writeFile(storagePath, buffer);
    }

    const document = await documentRepository.create({
      id: documentId,
      title: path.parse(file.name).name,
      filename: file.name,
      storagePath,
      mimeType: file.type || "application/pdf",
      status: "PROCESSING",
      source: "user",
    });

    return {
      document,
      buffer,
    };
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
