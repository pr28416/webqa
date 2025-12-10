import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tests } from "@/lib/db/schema/test-executions";
import { eq } from "drizzle-orm";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tests/[id]
 * Fetches a single test
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 },
      );
    }

    // Fetch the test
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.testId, id))
      .limit(1);

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error("Error fetching test:", error);
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
 * Updates a test
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { title, instructions, metadata } = body;

    // Build update object
    const updateData: Partial<typeof tests.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (typeof title !== "string") {
        return NextResponse.json(
          { error: "Title must be a string" },
          { status: 400 },
        );
      }
      updateData.title = title;
    }

    if (instructions !== undefined) {
      if (typeof instructions !== "string") {
        return NextResponse.json(
          { error: "Instructions must be a string" },
          { status: 400 },
        );
      }
      updateData.instructions = instructions;
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    // Update the test
    const [updatedTest] = await db
      .update(tests)
      .set(updateData)
      .where(eq(tests.testId, id))
      .returning();

    if (!updatedTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error("Error updating test:", error);
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
 * DELETE /api/tests/[id]
 * Deletes a test
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 },
      );
    }

    // Delete the test
    const [deletedTest] = await db
      .delete(tests)
      .where(eq(tests.testId, id))
      .returning();

    if (!deletedTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
