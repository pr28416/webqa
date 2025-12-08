import { createAgentUIStreamResponse } from "ai";
import { NextRequest } from "next/server";
import Kernel from "@onkernel/sdk";
import { createChatAgent } from "@/lib/agents/chat-agent";
import { createStagehandInstance } from "@/lib/stagehand/instance";

/**
 * POST /api/chat
 *
 * Handles chat messages and streams agent responses.
 * This endpoint is called by the UI chat component to interact with the AI agent.
 *
 * @param request - Next.js request containing messages array and browserId
 * @returns Streaming response with agent's text and tool calls
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, browserId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!browserId || typeof browserId !== "string") {
      return new Response(JSON.stringify({ error: "Browser ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    // Stream the agent's response
    return createAgentUIStreamResponse({
      agent,
      messages,
      abortSignal: abortController.signal,
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
