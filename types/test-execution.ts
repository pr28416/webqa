import { z } from "zod";
import {
  interactionEvents,
  interactions,
} from "@/lib/db/schema/test-executions";

/**
 * Type-safe representation of an interaction (test execution) record
 */
export type Interaction = typeof interactions.$inferSelect;

/**
 * Type for inserting a new interaction
 */
export type NewInteraction = typeof interactions.$inferInsert;

/**
 * Type-safe representation of an interaction event record
 */
export type InteractionEvent = typeof interactionEvents.$inferSelect;

/**
 * Type for inserting a new interaction event
 */
export type NewInteractionEvent = typeof interactionEvents.$inferInsert;

/**
 * Valid status values for an interaction
 */
export type InteractionStatus =
  | "running"
  | "passed"
  | "failed"
  | "error"
  | "canceled";

/**
 * Event family classification for grouping similar events
 */
export type EventFamily =
  | "lifecycle"
  | "text"
  | "reasoning"
  | "tool-input"
  | "tool-output"
  | "data"
  | "error";

/**
 * Role classification for events
 */
export type EventRole = "system" | "user" | "assistant" | "tool";

/**
 * Zod schema for interaction metadata
 * This is the source of truth for metadata validation
 */
export const interactionMetadataSchema = z.object({
  browserId: z.string().optional(),
  repo: z.string().optional(),
  commit: z.string().optional(),
  branch: z.string().optional(),
  environment: z.string().optional(),
}).catchall(z.unknown()); // Allow additional properties but validate known ones

/**
 * TypeScript type derived from Zod schema
 * This ensures type safety matches runtime validation
 */
export type InteractionMetadata = z.infer<typeof interactionMetadataSchema>;
