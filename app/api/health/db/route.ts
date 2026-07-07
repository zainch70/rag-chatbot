import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    const result = await db.execute(sql`
      SELECT
        current_database(),
        current_user,
        version();
    `);

    return Response.json(result);
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}