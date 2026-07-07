import { NextResponse } from "next/server";

import { documentService } from "@/services/document.service";
import { ingestionService } from "@/services/ingestion.service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          message: "PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    // Upload the file and create the document record
    const document = await documentService.upload(file);

    // Process the uploaded document
    await ingestionService.process({
      id: document.id,
      storagePath: document.storagePath,
    });

    // Return the latest document status
    return NextResponse.json(
      {
        documentId: document.id,
        status: "READY",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}