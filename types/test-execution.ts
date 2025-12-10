import { interactions, interactionEvents } from "@/lib/db/schema/test-executions";

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
export type InteractionStatus = "running" | "passed" | "failed" | "error" | "canceled";

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
 * Metadata that can be stored with an interaction
 */
export interface InteractionMetadata {
  browserId?: string;
  repo?: string;
  commit?: string;
  branch?: string;
  environment?: string;
  [key: string]: unknown;
}

