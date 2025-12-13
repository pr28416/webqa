import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/executions
 * Fetches all test executions (interactions) from the database
 * Supports optional testId filter
 * Joins with tests table to get test title
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const testId = searchParams.get("testId");

    // Build query with join to tests table
    let query = db
      .select({
        interaction: schema.interactions,
        testTitle: schema.tests.title,
      })
      .from(schema.interactions)
      .leftJoin(
        schema.tests,
        eq(schema.interactions.testId, schema.tests.testId),
      )
      .orderBy(desc(schema.interactions.startedAt))
      .limit(limit)
      .offset(offset);

    // Apply testId filter if provided
    if (testId) {
      query = query.where(
        eq(schema.interactions.testId, testId),
      ) as typeof query;
    }

    const results = await query;

    // Map results to include test title in interaction object
    const interactions = results.map((row) => ({
      ...row.interaction,
      title: row.testTitle,
    }));

    return NextResponse.json({
      interactions,
      limit,
      offset,
      count: interactions.length,
    });
  } catch (error) {
    console.error("Error fetching test executions:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
