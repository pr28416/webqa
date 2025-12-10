import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tests } from "@/lib/db/schema/test-executions";
import { desc } from "drizzle-orm";

/**
 * GET /api/tests
 * Fetches all tests from the database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch tests ordered by most recent first
    const allTests = await db
      .select()
      .from(tests)
      .orderBy(desc(tests.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      tests: allTests,
      limit,
      offset,
      count: allTests.length,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
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
 * POST /api/tests
 * Creates a new test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, title, instructions, metadata = {} } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 },
      );
    }

    if (!instructions || typeof instructions !== "string") {
      return NextResponse.json(
        { error: "Instructions are required and must be a string" },
        { status: 400 },
      );
    }

    if (testId && typeof testId !== "string") {
      return NextResponse.json(
        { error: "Test ID must be a string" },
        { status: 400 },
      );
    }

    // Create the test with optional custom testId
    const values: typeof tests.$inferInsert = {
      title,
      instructions,
      metadata,
      updatedAt: new Date(),
    };

    // If testId is provided, use it; otherwise let the DB generate one
    if (testId) {
      values.testId = testId;
    }

    const [newTest] = await db
      .insert(tests)
      .values(values)
      .returning();

    return NextResponse.json(newTest, { status: 201 });
  } catch (error) {
    console.error("Error creating test:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
