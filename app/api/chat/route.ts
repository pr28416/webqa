import { createAgentUIStreamResponse } from "ai";
import { NextRequest } from "next/server";
import Kernel from "@onkernel/sdk";
import { createChatAgent } from "@/lib/agents/chat-agent";
import { createStagehandInstance } from "@/lib/stagehand/instance";
import { db } from "@/lib/db";
import {
  interactionEvents,
  interactions,
} from "@/lib/db/schema/test-executions";
import { normalizeEvent } from "@/lib/db/event-mapper";
import type { Interaction, InteractionMetadata } from "@/types/test-execution";
import type { TestExecutionRequest } from "@/types/api";
import { and, eq, sql } from "drizzle-orm";

/**
 * POST /api/chat
 *
 * Handles chat messages and streams agent responses.
 * This endpoint is called by the UI chat component to interact with the AI agent.
 *
 * @param request - Next.js request containing messages array, browserId, and testId
 * @returns Streaming response with agent's text and tool calls
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, browserId, testId }: TestExecutionRequest = await request
      .json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!browserId || typeof browserId !== "string") {
      return new Response(JSON.stringify({ error: "Browser ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find existing running interaction for this browser session, or create new one
    // Use a retry pattern to handle race conditions where multiple requests
    // try to create an interaction simultaneously
    let interaction: Interaction | null = await db
      .select()
      .from(interactions)
      .where(
        and(
          sql`${interactions.metadata}->>'browserId' = ${browserId}`,
          eq(interactions.status, "running"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!interaction) {
      // Extract user prompt from the first user message
      const userMessage = messages.find((m: { role: string }) =>
        m.role === "user"
      );
      const userPrompt = userMessage?.parts?.[0]?.text ||
        userMessage?.content ||
        "Test execution";

      try {
        // Try to create new interaction record
        // The unique index on (browserId, status='running') prevents duplicates
        const [newInteraction] = await db
          .insert(interactions)
          .values({
            userPrompt,
            status: "running",
            testId: testId || null,
            metadata: {
              browserId,
            } satisfies InteractionMetadata,
          })
          .returning();

        interaction = newInteraction;

        console.log(
          `[Test Execution] Created new interaction ${interaction.interactionId}`,
        );
      } catch (error) {
        // If insert fails due to unique constraint violation (race condition),
        // another request created the interaction - fetch it
        if (error instanceof Error && error.message.includes("unique")) {
          interaction = await db
            .select()
            .from(interactions)
            .where(
              and(
                sql`${interactions.metadata}->>'browserId' = ${browserId}`,
                eq(interactions.status, "running"),
              ),
            )
            .limit(1)
            .then((rows) => rows[0]);

          if (!interaction) {
            // This should never happen, but throw if we still can't find it
            throw new Error(
              "Failed to create or find interaction for browser session",
            );
          }

          console.log(
            `[Test Execution] Race condition detected, using existing interaction ${interaction.interactionId}`,
          );
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    } else {
      console.log(
        `[Test Execution] Reusing existing interaction ${interaction.interactionId}`,
      );
    }

    // Get the existing browser instance from Kernel
    const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
    const kernelBrowser = await kernel.browsers.retrieve(browserId);

    // Create Stagehand instance connected to the existing browser
    const stagehand = await createStagehandInstance(kernelBrowser.cdp_ws_url);

    // Create the chat agent with the Stagehand instance
    const agent = createChatAgent(stagehand);

    // Create abort controller for cancellation support (client-side disconnects)
    const abortController = new AbortController();

    // Get the original stream response (await it since it returns a Promise)
    const originalResponse = await createAgentUIStreamResponse({
      agent,
      messages,
      abortSignal: abortController.signal,
    });

    // Track sequence number for events
    let seq = 0;
    let hasError = false;

    // Create a TransformStream to intercept and save all chunks
    const loggingStream = new TransformStream({
      async transform(chunk, controller) {
        try {
          // Decode the chunk (it's a Uint8Array)
          const decoder = new TextDecoder();
          const text = decoder.decode(chunk);

          // Parse SSE format: "data: {...}\n\n"
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6); // Remove "data: " prefix

              // Skip [DONE] marker - it's not JSON
              if (jsonStr === "[DONE]") {
                continue;
              }

              try {
                const event = JSON.parse(jsonStr);
                const normalized = normalizeEvent(event);

                if (normalized) {
                  const { eventType, eventFamily, streamId, role, payload } =
                    normalized;

                  // Save every event exactly as it comes in
                  db.insert(interactionEvents)
                    .values({
                      interactionId: interaction.interactionId,
                      seq: seq++,
                      role,
                      eventFamily,
                      eventType,
                      payload,
                      streamId,
                    })
                    .catch((error) => {
                      console.error(
                        "[Test Execution] Failed to save event:",
                        error,
                      );
                    });

                  // Check for finish or error events
                  if (eventType === "finish") {
                    // Update interaction status on finish
                    db.update(interactions)
                      .set({
                        status: hasError ? "error" : "passed",
                        finishedAt: new Date(),
                      })
                      .where(
                        eq(
                          interactions.interactionId,
                          interaction.interactionId,
                        ),
                      )
                      .catch((error) => {
                        console.error(
                          "[Test Execution] Failed to update interaction:",
                          error,
                        );
                      });
                  } else if (eventFamily === "error") {
                    hasError = true;
                  }
                }
              } catch (error) {
                // Not JSON or not a data event
                console.error("[Test Execution] Failed to parse event:", error);
              }
            }
          }
        } catch (error) {
          console.error("[Test Execution] Error processing chunk:", error);
          // Don't throw - we want to keep streaming to the client
        }

        // Always forward the chunk to the client
        controller.enqueue(chunk);
      },

      async flush() {
        // Stream ended - ensure interaction is marked as complete
        console.log(
          `[Test Execution] Stream ended for interaction ${interaction.interactionId}`,
        );

        // Final update if not already done
        db.update(interactions)
          .set({
            status: hasError ? "error" : "passed",
            finishedAt: new Date(),
          })
          .where(eq(interactions.interactionId, interaction.interactionId))
          .catch((error) => {
            console.error(
              "[Test Execution] Failed to update interaction on flush:",
              error,
            );
          });
      },
    });

    // Ensure response body exists
    if (!originalResponse.body) {
      throw new Error("Response body is null - cannot stream events");
    }

    // Pipe the original stream through our logging stream
    const transformedBody = originalResponse.body.pipeThrough(loggingStream);

    // Return new response with the transformed stream
    return new Response(transformedBody, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers,
    });
  } catch (error) {
    console.error("Error in chat API:", error);

    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
