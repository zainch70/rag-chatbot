import { access } from "fs/promises";

import { NextResponse } from "next/server";

import { documentProcessorService } from "@/services/document-processor.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { filePath }: { filePath?: string } = body;

    if (!filePath?.trim()) {
      return NextResponse.json(
        {
          message: "filePath is required.",
        },
        {
          status: 400,
        }
      );
    }

    await access(filePath);

    const extracted =
      await documentProcessorService.extractText(filePath);

    return NextResponse.json(extracted);
  } catch (error) {
    console.error("PDF extraction test failed:", error);

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
