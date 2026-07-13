export const PDF_MAX_SIZE_BYTES = 25 * 1024 * 1024;//25 mb

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

function hasPdfExtension(filename: string) {
  return filename.toLowerCase().endsWith(".pdf");
}

function hasAllowedMimeType(mimeType: string) {
  return !mimeType || mimeType === "application/pdf";
}

export function validatePdfMetadata(file: {
  name: string;
  type: string;
  size: number;
}) {
  if (!file.name.trim()) {
    throw new PdfValidationError("A file name is required.");
  }

  if (file.size === 0) {
    throw new PdfValidationError("The selected file is empty.");
  }

  if (file.size > PDF_MAX_SIZE_BYTES) {
    throw new PdfValidationError(
      `File is too large. Maximum allowed size is ${PDF_MAX_SIZE_BYTES / (1024 * 1024)} MB.`
    );
  }

  if (!hasPdfExtension(file.name)) {
    throw new PdfValidationError("Only PDF files are allowed.");
  }

  if (!hasAllowedMimeType(file.type)) {
    throw new PdfValidationError("Only PDF files are allowed.");
  }
}

export function validatePdfBuffer(buffer: Buffer | Uint8Array) {
  if (buffer.length < 4) {
    throw new PdfValidationError(
      "The selected file does not appear to be a valid PDF."
    );
  }

  const header = String.fromCharCode(
    buffer[0],
    buffer[1],
    buffer[2],
    buffer[3]
  );

  if (header !== "%PDF") {
    throw new PdfValidationError(
      "The selected file does not appear to be a valid PDF."
    );
  }
}

export async function validatePdfFile(file: File) {
  validatePdfMetadata(file);

  const header = await file.slice(0, 4).text();

  if (!header.startsWith("%PDF")) {
    throw new PdfValidationError(
      "The selected file does not appear to be a valid PDF."
    );
  }
}
