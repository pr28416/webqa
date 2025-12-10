import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/executions/cancel
 * Marks a running interaction as canceled by browserId
 */
export async function POST(request: NextRequest) {
  try {
    const { browserId } = await request.json();

    if (!browserId || typeof browserId !== "string") {
      return NextResponse.json(
        { error: "Browser ID is required" },
        { status: 400 }
      );
    }

    // Find and update the running interaction for this browser session
    const [updatedInteraction] = await db
      .update(schema.interactions)
      .set({
        status: "canceled",
        finishedAt: new Date(),
      })
      .where(
        and(
          sql`${schema.interactions.metadata}->>'browserId' = ${browserId}`,
          eq(schema.interactions.status, "running")
        )
      )
      .returning();

    if (!updatedInteraction) {
      return NextResponse.json(
        { error: "No running interaction found for this browser session" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, interaction: updatedInteraction });
  } catch (error) {
    console.error("Error canceling execution:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

