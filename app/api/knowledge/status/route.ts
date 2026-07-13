import { NextResponse } from "next/server";

import { knowledgeSeedService } from "@/services/knowledge-seed.service";

export async function GET() {
  try {
    const status = await knowledgeSeedService.getStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Knowledge status check failed:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}
