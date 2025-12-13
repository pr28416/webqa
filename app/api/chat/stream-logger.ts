import { db } from "@/lib/db";
import {
  interactionEvents,
  interactions,
} from "@/lib/db/schema/test-executions";
import { eq } from "drizzle-orm";
import { normalizeEvent } from "@/lib/db/event-mapper";
import type { Interaction } from "@/types/test-execution";

/**
 * Wraps an agent UI stream response with database logging.
 *
 * This creates a transparent logging layer that:
 * 1. Intercepts all SSE events from the stream
 * 2. Saves them to the database (interactions + interaction_events tables)
 * 3. Passes the original stream through unchanged to the client
 *
 * @param response - The original Response object from createAgentUIStreamResponse
 * @param interaction - The interaction record to associate events with
 * @returns A new Response with the same stream, but with logging attached
 */
export function wrapStreamWithLogging(
  response: Response,
  interaction: Interaction,
): Response {
  // Ensure response body exists
  if (!response.body) {
    throw new Error("Response body is null - cannot attach logging");
  }

  // Track state for this interaction
  let seq = 0;
  let hasError = false;
  let isFinished = false;

  // Helper: Parse SSE line and extract JSON event
  const parseSSELine = (line: string) => {
    if (!line.startsWith("data: ")) return null;
    const jsonStr = line.slice(6);
    if (jsonStr === "[DONE]") return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  // Helper: Save normalized event to database
  const saveEvent = (normalized: ReturnType<typeof normalizeEvent>) => {
    if (!normalized) return;

    db.insert(interactionEvents)
      .values({
        interactionId: interaction.interactionId,
        seq: seq++,
        role: normalized.role,
        eventFamily: normalized.eventFamily,
        eventType: normalized.eventType,
        payload: normalized.payload,
        streamId: normalized.streamId,
      })
      .catch((error) => {
        console.error("[Stream Logger] Failed to save event:", error);
      });
  };

  // Helper: Mark interaction as complete (idempotent)
  const finalizeInteraction = () => {
    if (isFinished) return;
    isFinished = true;

    db.update(interactions)
      .set({
        status: hasError ? "error" : "passed",
        finishedAt: new Date(),
      })
      .where(eq(interactions.interactionId, interaction.interactionId))
      .catch((error) => {
        console.error("[Stream Logger] Failed to finalize interaction:", error);
      });
  };

  // Create transparent logging layer
  const loggingStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      try {
        // Parse SSE events from chunk
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split("\n")) {
          const event = parseSSELine(line);
          if (!event) continue;

          const normalized = normalizeEvent(event);
          if (!normalized) continue;

          // Save to database
          saveEvent(normalized);

          // Track error state and finalize on finish
          if (normalized.eventFamily === "error") {
            hasError = true;
          } else if (normalized.eventType === "finish") {
            finalizeInteraction();
          }
        }
      } catch (error) {
        console.error("[Stream Logger] Error processing chunk:", error);
      }

      // Always pass chunk through to client
      controller.enqueue(chunk);
    },

    async flush() {
      console.log(
        `[Stream Logger] Stream ended for interaction ${interaction.interactionId}`,
      );
      finalizeInteraction();
    },
  });

  // Pipe original stream through logging layer
  const transformedBody = response.body.pipeThrough(loggingStream);

  // Return new Response with logged stream
  return new Response(transformedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

