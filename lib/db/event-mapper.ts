import { EventFamily, EventRole } from "@/types/test-execution";

/**
 * Maps AI SDK stream event types to normalized event families.
 * This allows us to group related events (e.g., all text-related events)
 * for easier querying and analysis.
 */
export function mapEventFamily(eventType: string): EventFamily {
  // Lifecycle events
  if (eventType === "start" || eventType === "finish") {
    return "lifecycle";
  }

  // Text events
  if (eventType.startsWith("text-")) {
    return "text";
  }

  // Reasoning/thinking events
  if (eventType.startsWith("reasoning-")) {
    return "reasoning";
  }

  // Tool input events
  if (eventType.startsWith("tool-input-")) {
    return "tool-input";
  }

  // Tool output events
  if (
    eventType.startsWith("tool-output-") ||
    eventType === "tool-output-available"
  ) {
    return "tool-output";
  }

  // Data events (custom data streams)
  if (eventType.startsWith("data-")) {
    return "data";
  }

  // Error events
  if (eventType === "error" || eventType.includes("error")) {
    return "error";
  }

  // Default to data for unknown types
  return "data";
}

/**
 * Extracts the stream ID from an event for grouping related events.
 * This allows us to reconstruct complete messages/tools from their delta events.
 */
export function extractStreamId(event: unknown): string | null {
  if (!isRecord(event)) {
    return null;
  }

  // Try common ID fields in order of priority
  const idFields = [
    "id", // Text/reasoning message ID
    "toolCallId", // Tool call ID
    "messageId", // Alternative message ID
  ];

  for (const field of idFields) {
    const value = event[field];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

/**
 * Infers the role from an event type.
 * Used when the event doesn't explicitly specify a role.
 */
export function inferRole(event: unknown): EventRole {
  if (!isRecord(event)) {
    return "assistant";
  }

  // If role is explicitly provided, use it
  if (typeof event.role === "string") {
    const role = event.role.toLowerCase();
    if (isValidRole(role)) {
      return role as EventRole;
    }
  }

  // Infer from event type
  const eventType = typeof event.type === "string" ? event.type : "";

  // Tool-related events
  if (eventType.startsWith("tool-")) {
    return "tool";
  }

  // Most stream events come from the assistant
  return "assistant";
}

/**
 * Extracts the delta/content from an event.
 * Used to reconstruct full text from delta events.
 */
export function extractDelta(event: unknown): string | null {
  if (!isRecord(event)) {
    return null;
  }

  // Try common delta fields
  if (typeof event.delta === "string") {
    return event.delta;
  }

  if (typeof event.text === "string") {
    return event.text;
  }

  if (typeof event.content === "string") {
    return event.content;
  }

  return null;
}

/**
 * Helper to check if a value is a record (object with string keys)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a string is a valid EventRole
 */
function isValidRole(role: string): role is EventRole {
  return ["system", "user", "assistant", "tool"].includes(role);
}

/**
 * Normalizes an AI SDK stream event into a database-friendly structure.
 * This extracts the key information we need to store and query.
 */
export interface NormalizedEvent {
  eventType: string;
  eventFamily: EventFamily;
  role: EventRole;
  streamId: string | null;
  payload: Record<string, unknown>;
}

export function normalizeEvent(event: unknown): NormalizedEvent | null {
  if (!isRecord(event)) {
    return null;
  }

  const eventType = typeof event.type === "string" ? event.type : "unknown";

  return {
    eventType,
    eventFamily: mapEventFamily(eventType),
    role: inferRole(event),
    streamId: extractStreamId(event),
    payload: event,
  };
}
