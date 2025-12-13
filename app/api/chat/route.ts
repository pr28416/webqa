import {
  createAgentUIStreamResponse,
  isTextUIPart,
  UIDataTypes,
  UIMessage,
  UITools,
} from "ai";
import { NextRequest } from "next/server";
import Kernel from "@onkernel/sdk";
import { createChatAgent } from "@/lib/agents/chat-agent";
import { createStagehandInstance } from "@/lib/stagehand/instance";
import { wrapStreamWithLogging } from "./stream-logger";
import { db } from "@/lib/db";
import { interactions } from "@/lib/db/schema/test-executions";
import type { Interaction } from "@/types/test-execution";
import { validateInteractionMetadata } from "@/lib/db/metadata-helpers";
import {
  validateSchema,
  ValidationError,
  validationErrorToResponse,
} from "@/lib/validation";
import { testExecutionRequestSchema } from "@/lib/schemas/api";
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
    // Validate entire request body against schema
    const { messages, browserId, testId } = validateSchema(
      await request.json(),
      testExecutionRequestSchema,
      "Invalid request body",
    );

    // Extract user prompt from the first user message
    const userMessage = messages.find(
      (m): m is UIMessage<unknown, UIDataTypes, UITools> => m.role === "user",
    );
    const firstPart = userMessage?.parts?.[0];
    const userPrompt = firstPart && isTextUIPart(firstPart)
      ? firstPart.text
      : undefined;

    if (!userPrompt) {
      throw new Error("User prompt is required");
    }

    // Optimistically try to create a new interaction
    // The unique index on (browserId, status='running') prevents duplicates
    // If an interaction already exists, we'll catch the error and fetch it
    let interaction: Interaction;

    try {
      // Validate metadata before inserting
      const metadata = validateInteractionMetadata({
        browserId,
      });

      const [newInteraction] = await db
        .insert(interactions)
        .values({
          userPrompt,
          status: "running",
          testId,
          metadata,
        })
        .returning();

      interaction = newInteraction;

      console.log(
        `[Test Execution] Created new interaction ${interaction.interactionId}`,
      );
    } catch (error) {
      // If insert fails due to unique constraint violation,
      // another request already created an interaction - fetch it
      if (error instanceof Error && error.message.includes("unique")) {
        const [existingInteraction] = await db
          .select()
          .from(interactions)
          .where(
            and(
              sql`${interactions.metadata}->>'browserId' = ${browserId}`,
              eq(interactions.status, "running"),
            ),
          )
          .limit(1);

        if (!existingInteraction) {
          throw new Error(
            "Failed to find interaction after constraint violation",
          );
        }

        interaction = existingInteraction;

        console.log(
          `[Test Execution] Reusing existing interaction ${interaction.interactionId}`,
        );
      } else {
        // Re-throw other errors
        throw error;
      }
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

    // Get the original stream response from the agent
    const originalResponse = await createAgentUIStreamResponse({
      agent,
      messages,
      abortSignal: abortController.signal,
    });

    // Wrap with database logging (transparently logs events while streaming to client)
    return wrapStreamWithLogging(originalResponse, interaction);
  } catch (error) {
    console.error("Error in chat API:", error);

    // Handle validation errors with proper status codes
    if (error instanceof ValidationError) {
      return validationErrorToResponse(error);
    }

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
