import { validatePdfFile } from "@/lib/validate-pdf-upload";

export async function uploadDocument(file: File) {
  await validatePdfFile(file);

  let response: Response;

  try {
    const formData = new FormData();
    formData.append("file", file);

    response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again."
    );
  }

  let data: {
    documentId?: string;
    status?: string;
    message?: string;
  };

  try {
    data = (await response.json()) as {
      documentId?: string;
      status?: string;
      message?: string;
    };
  } catch {
    throw new Error("Unexpected server response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(data.message ?? "Upload failed.");
  }

  if (!data.documentId) {
    throw new Error("Upload completed but no document id was returned.");
  }

  return {
    documentId: data.documentId,
    status: data.status ?? "",
    filename: file.name,
  };
}
