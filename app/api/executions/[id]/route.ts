import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { ExecutionDetailResponse } from "@/types/api";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tests/[id]
 * Fetches a single test execution with all its events
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 },
      );
    }

    // Fetch the interaction with joined test title
    const [result] = await db
      .select({
        interaction: schema.interactions,
        testTitle: schema.tests.title,
      })
      .from(schema.interactions)
      .leftJoin(
        schema.tests,
        eq(schema.interactions.testId, schema.tests.testId),
      )
      .where(eq(schema.interactions.interactionId, id))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "Test execution not found" },
        { status: 404 },
      );
    }

    // Fetch all events for this interaction, ordered by sequence
    const events = await db
      .select()
      .from(schema.interactionEvents)
      .where(eq(schema.interactionEvents.interactionId, id))
      .orderBy(asc(schema.interactionEvents.seq));

    return NextResponse.json<ExecutionDetailResponse>({
      interaction: result.interaction,
      events,
      title: result.testTitle,
    });
  } catch (error) {
    console.error("Error fetching test execution:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tests/[id]
 * Updates a test execution (currently supports updating title)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { status } = body;

    // Build update object
    const updateData: Partial<typeof schema.interactions.$inferInsert> = {};

    if (status !== undefined) {
      const validStatuses = [
        "running",
        "passed",
        "failed",
        "error",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 },
        );
      }
      updateData.status = status;
      if (status !== "running") {
        updateData.finishedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Update the interaction
    const [updatedInteraction] = await db
      .update(schema.interactions)
      .set(updateData)
      .where(eq(schema.interactions.interactionId, id))
      .returning();

    if (!updatedInteraction) {
      return NextResponse.json(
        { error: "Test execution not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedInteraction);
  } catch (error) {
    console.error("Error updating test execution:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
