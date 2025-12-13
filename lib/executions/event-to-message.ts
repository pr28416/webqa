import type { UIDataTypes, UIMessage, UITools } from "ai";
import type { InteractionEvent } from "@/types/test-execution";

/**
 * Converts interaction events to chat messages format for display in ChatView
 * Now handles raw streaming events (-start, -delta, -end) and reconstructs them
 * Returns messages in AI SDK's UIMessage format
 */
export function convertEventsToMessages(
  events: InteractionEvent[],
): UIMessage<unknown, UIDataTypes, UITools>[] {
  const messages: UIMessage<unknown, UIDataTypes, UITools>[] = [];

  if (events.length === 0) return [];

  // Group events by role changes - when role changes between user and assistant, start new message
  let currentMessage: {
    id: string;
    role: "user" | "assistant";
    firstSeq: number;
    parts: Array<
      | { type: "text"; text: string; partSeq?: number }
      | { type: "reasoning"; text: string; partSeq?: number }
      | {
        type: string;
        toolCallId: string;
        partSeq?: number;
        input?: unknown;
        output?: unknown;
        state: string;
      }
    >;
  } | null = null;

  // Track accumulations for delta events by streamId
  const streamAccumulators = new Map<
    string,
    {
      type: "text" | "reasoning";
      text: string;
      partSeq: number;
    }
  >();

  // Track tool calls by their toolCallId
  const toolCallMap = new Map<
    string,
    {
      type: string;
      toolCallId: string;
      partSeq: number;
      input?: unknown;
      output?: unknown;
      state: string;
    }
  >();

  for (const event of events) {
    // Map role: user stays user, assistant/tool/system all become assistant
    const role = event.role === "user" ? "user" : "assistant";
    const payload = event.payload as Record<string, unknown>;
    const eventType = event.eventType;

    // Start a new message if role changes between user and assistant
    if (!currentMessage || currentMessage.role !== role) {
      // Save previous message if it has parts
      if (currentMessage && currentMessage.parts.length > 0) {
        // Sort parts by partSeq
        const sortedParts = [...currentMessage.parts].sort((a, b) => {
          const seqA = a.partSeq ?? Infinity;
          const seqB = b.partSeq ?? Infinity;
          return seqA - seqB;
        });
        // Remove partSeq and convert to proper UIMessage parts
        const cleanedParts = sortedParts.map((part) => {
          if (
            "text" in part &&
            (part.type === "text" || part.type === "reasoning")
          ) {
            return { type: part.type, text: part.text };
          }
          // Tool parts - keep all necessary fields, remove partSeq
          const { partSeq, ...toolPart } = part;
          void partSeq; // Mark as intentionally unused
          return toolPart;
        });
        messages.push({
          id: currentMessage.id,
          role: currentMessage.role,
          parts: cleanedParts,
        } as UIMessage<unknown, UIDataTypes, UITools>);
      }

      // Create new message
      const messageId = event.streamId || `msg-${event.interactionEventId}`;
      currentMessage = {
        id: messageId,
        role,
        firstSeq: event.seq,
        parts: [],
      };
    }

    // Handle text and reasoning events (with -start, -delta, -end)
    if (event.eventFamily === "text" || event.eventFamily === "reasoning") {
      const streamId = event.streamId ||
        `${event.eventFamily}-${event.interactionEventId}`;
      const partType = event.eventFamily;

      if (eventType.endsWith("-start")) {
        // Start accumulating
        const text = typeof payload.text === "string" ? payload.text : "";
        streamAccumulators.set(streamId, {
          type: partType,
          text,
          partSeq: event.seq,
        });
      } else if (eventType.endsWith("-delta")) {
        // Accumulate delta
        const accumulator = streamAccumulators.get(streamId);
        if (accumulator) {
          const delta = typeof payload.delta === "string"
            ? payload.delta
            : typeof payload.text === "string"
            ? payload.text
            : "";
          accumulator.text += delta;
        }
      } else if (eventType.endsWith("-end")) {
        // Finalize and add to message
        const accumulator = streamAccumulators.get(streamId);
        if (accumulator) {
          if (accumulator.type === "text") {
            currentMessage.parts.push({
              type: "text",
              text: accumulator.text,
              partSeq: accumulator.partSeq,
            });
          } else {
            currentMessage.parts.push({
              type: "reasoning",
              text: accumulator.text,
              partSeq: accumulator.partSeq,
            });
          }
          streamAccumulators.delete(streamId);
        }
      }
    } // Handle tool events
    else if (
      event.eventFamily === "tool-input" ||
      event.eventFamily === "tool-output"
    ) {
      const toolCallId =
        (typeof payload.toolCallId === "string" ? payload.toolCallId : null) ||
        event.streamId ||
        `tool-${event.interactionEventId}`;

      const toolName = typeof payload.toolName === "string"
        ? payload.toolName
        : "unknown";
      const toolType = `tool-${toolName}`;

      if (event.eventFamily === "tool-input") {
        // Tool input event
        let toolPart = toolCallMap.get(toolCallId);
        if (!toolPart) {
          toolPart = {
            type: toolType,
            toolCallId,
            partSeq: event.seq,
            input: payload,
            state: "input-available",
          };
          toolCallMap.set(toolCallId, toolPart);
          currentMessage.parts.push(toolPart);
        } else {
          // Update existing tool part
          toolPart.input = payload;
          if (event.seq < toolPart.partSeq) {
            toolPart.partSeq = event.seq;
          }
        }
      } else if (event.eventFamily === "tool-output") {
        // Tool output event
        let toolPart = toolCallMap.get(toolCallId);
        if (!toolPart) {
          toolPart = {
            type: toolType,
            toolCallId,
            partSeq: event.seq,
            output: payload.output || payload,
            state: "output-available",
          };
          toolCallMap.set(toolCallId, toolPart);
          currentMessage.parts.push(toolPart);
        } else {
          // Update existing tool part
          toolPart.output = payload.output || payload;
          toolPart.state = "output-available";
        }
      }
    }
  }

  // Don't forget the last message
  if (currentMessage && currentMessage.parts.length > 0) {
    // Sort parts by partSeq
    const sortedParts = [...currentMessage.parts].sort((a, b) => {
      const seqA = a.partSeq ?? Infinity;
      const seqB = b.partSeq ?? Infinity;
      return seqA - seqB;
    });
    // Remove partSeq and convert to proper UIMessage parts
    const cleanedParts = sortedParts.map((part) => {
      if (
        "text" in part && (part.type === "text" || part.type === "reasoning")
      ) {
        return { type: part.type, text: part.text };
      }
      // Tool parts - keep all necessary fields, remove partSeq
      const { partSeq, ...toolPart } = part;
      void partSeq; // Mark as intentionally unused
      return toolPart;
    });
    messages.push({
      id: currentMessage.id,
      role: currentMessage.role,
      parts: cleanedParts,
    } as UIMessage<unknown, UIDataTypes, UITools>);
  }

  return messages;
}
