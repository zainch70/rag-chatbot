import PDFParser from "pdf2json";

import type { ExtractedPage } from "@/types/document";

export class DocumentProcessorService {
  async extractText(filePath: string): Promise<ExtractedPage> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (error) => {
        const message =
          error instanceof Error ? error.message : error.parserError.message;

        reject(new Error(message));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const text = pdfData.Pages.map((page) =>
          page.Texts.map((textItem) =>
            textItem.R.map((run) => decodeURIComponent(run.T)).join("")
          ).join("")
        ).join("\n\n");

        resolve({
          text: text.trim(),
        });
      });

      pdfParser.loadPDF(filePath);
    });
  }
}

export const documentProcessorService =
  new DocumentProcessorService();