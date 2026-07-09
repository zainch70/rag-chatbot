import PDFParser from "pdf2json";

import { parsePdfDataToText } from "@/lib/parse-pdf-text";

import type { ExtractedPage } from "@/types/document";

export class DocumentProcessorService {
  private extractFromParser(pdfParser: PDFParser) {
    return new Promise<ExtractedPage>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (error) => {
        const message =
          error instanceof Error ? error.message : error.parserError.message;

        reject(new Error(message));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        resolve({
          text: parsePdfDataToText(pdfData),
        });
      });
    });
  }

  async extractTextFromBuffer(buffer: Buffer): Promise<ExtractedPage> {
    const pdfParser = new PDFParser();
    const result = this.extractFromParser(pdfParser);
    pdfParser.parseBuffer(buffer);
    return result;
  }

  async extractText(filePath: string): Promise<ExtractedPage> {
    const pdfParser = new PDFParser();
    const result = this.extractFromParser(pdfParser);
    pdfParser.loadPDF(filePath);
    return result;
  }
}

export const documentProcessorService =
  new DocumentProcessorService();