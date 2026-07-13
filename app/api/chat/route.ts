import { NextResponse } from "next/server";

import { chatService, ChatRequestError } from "@/services/chat.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      message,
      limit,
    }: {
      message?: string;
      limit?: number;
    } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        {
          message: "message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await chatService.streamAnswer(message, {
      limit:
        typeof limit === "number"
          ? Math.min(Math.max(limit, 1), 10)
          : 5,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat request failed:", error);

    if (error instanceof ChatRequestError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: 400,
        }
      );
    }

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
