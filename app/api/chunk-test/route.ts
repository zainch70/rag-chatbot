import { NextResponse } from "next/server";

import { textChunkerService } from "@/services/text-chunker.service";

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text?.trim()) {
    return NextResponse.json(
      {
        message: "text is required.",
      },
      {
        status: 400,
      }
    );
  }

  const chunks = textChunkerService.chunk(text);

  return NextResponse.json({ chunks });
}
