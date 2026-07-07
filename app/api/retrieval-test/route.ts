import { NextResponse } from "next/server";

import { retrievalService } from "@/services/retrieval.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      query,
      limit,
      documentId,
    }: {
      query?: string;
      limit?: number;
      documentId?: string;
    } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        {
          message: "query is required.",
        },
        {
          status: 400,
        }
      );
    }

    const results = await retrievalService.search(query, {
      limit:
        typeof limit === "number"
          ? Math.min(Math.max(limit, 1), 10)
          : 5,
      documentId,
    });

    return NextResponse.json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Retrieval test failed:", error);

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
