import { NextResponse } from "next/server";

import { documentProcessorService } from "@/services/document-processor.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        {
          message: "filePath is required.",
        },
        {
          status: 400,
        }
      );
    }

    const document =
      await documentProcessorService.extractText(filePath);

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document extraction failed:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred.",
        stack:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.stack
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}