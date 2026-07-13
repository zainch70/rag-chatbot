import { randomUUID } from "crypto";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";

import { documentRepository } from "@/repositories/document.repository";
import {
  validatePdfBuffer,
  validatePdfMetadata,
} from "@/lib/validate-pdf-upload";

import { ingestionService } from "./ingestion.service";

const KNOWLEDGE_DIRECTORY_NAME = "knowledge";

export type SeededDocumentResult = {
  filename: string;
  documentId: string;
  status: "READY" | "FAILED";
  replaced: boolean;
};

export class KnowledgeSeedService {
  getKnowledgeDirectory() {
    return path.join(process.cwd(), KNOWLEDGE_DIRECTORY_NAME);
  }

  async listKnowledgePdfs() {
    const knowledgeDirectory = this.getKnowledgeDirectory();

    let entries: string[];

    try {
      entries = await readdir(knowledgeDirectory);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(
          `Knowledge directory not found at "${knowledgeDirectory}". Create it and add PDF files.`
        );
      }

      throw error;
    }

    const pdfFilenames = entries
      .filter((entry) => entry.toLowerCase().endsWith(".pdf"))
      .sort((left, right) => left.localeCompare(right));

    return pdfFilenames.map((filename) =>
      path.join(knowledgeDirectory, filename)
    );
  }

  async seedPdf(filePath: string): Promise<SeededDocumentResult> {
    const filename = path.basename(filePath);
    const fileStats = await stat(filePath);
    const buffer = await readFile(filePath);

    validatePdfMetadata({
      name: filename,
      type: "application/pdf",
      size: fileStats.size,
    });
    validatePdfBuffer(buffer);

    const existing = await documentRepository.findByFilenameAndSource(
      filename,
      "system"
    );
    const replaced = Boolean(existing);

    if (existing) {
      await documentRepository.deleteById(existing.id);
    }

    const documentId = randomUUID();
    const document = await documentRepository.create({
      id: documentId,
      title: path.parse(filename).name,
      filename,
      storagePath: filePath,
      mimeType: "application/pdf",
      status: "PROCESSING",
      source: "system",
    });

    try {
      await ingestionService.process({
        id: document.id,
        storagePath: document.storagePath,
        pdfBuffer: buffer,
      });

      return {
        filename,
        documentId: document.id,
        status: "READY",
        replaced,
      };
    } catch (error) {
      console.error(`Failed to seed "${filename}":`, error);

      return {
        filename,
        documentId: document.id,
        status: "FAILED",
        replaced,
      };
    }
  }

  async seedAll() {
    const pdfPaths = await this.listKnowledgePdfs();

    if (pdfPaths.length === 0) {
      throw new Error(
        `No PDF files found in "${this.getKnowledgeDirectory()}". Add at least one .pdf file.`
      );
    }

    const results: SeededDocumentResult[] = [];

    for (const pdfPath of pdfPaths) {
      console.log(`\nSeeding knowledge PDF: ${path.basename(pdfPath)}`);
      results.push(await this.seedPdf(pdfPath));
    }

    const readyCount = results.filter(
      (result) => result.status === "READY"
    ).length;

    return {
      knowledgeDirectory: this.getKnowledgeDirectory(),
      total: results.length,
      readyCount,
      failedCount: results.length - readyCount,
      results,
    };
  }

  async getStatus() {
    const documentCount =
      await documentRepository.countReadyBySource("system");

    return {
      ready: documentCount > 0,
      documentCount,
    };
  }
}

export const knowledgeSeedService = new KnowledgeSeedService();
