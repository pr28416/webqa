import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InteractionMetadata } from "@/types/test-execution";

/**
 * Tests Table
 *
 * Stores unique tests (reusable test definitions).
 * A test can have multiple executions (interactions).
 */
export const tests = pgTable(
  "tests",
  {
    testId: uuid("test_id").defaultRandom().primaryKey(),

    // Test definition
    // Nullable to support draft tests that are created but not yet fully configured
    title: text("title").default("Untitled Test"),
    instructions: text("instructions").default(""),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
      .defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => ({
    createdAtIdx: index("tests_created_at_idx").on(table.createdAt.desc()),
  }),
);

/**
 * Interactions Table
 *
 * Stores one row per test execution (chat interaction).
 * This is the parent table that tracks the overall test run.
 */
export const interactions = pgTable(
  "interactions",
  {
    interactionId: uuid("interaction_id").defaultRandom().primaryKey(),

    // Link to test (optional - for standalone executions)
    testId: uuid("test_id").references(() => tests.testId, {
      onDelete: "set null",
    }),

    // Test execution context
    userPrompt: text("user_prompt").notNull(),

    // Lifecycle
    status: text("status", {
      enum: ["running", "passed", "failed", "error", "canceled"],
    }).notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),

    // Summary and metadata
    assistantSummary: text("assistant_summary"),
    // Metadata column stores InteractionMetadata JSONB
    // Always use validateInteractionMetadata() when writing and parseInteractionMetadata() when reading
    // See lib/db/metadata-helpers.ts for validation helpers
    metadata: jsonb("metadata")
      .$type<InteractionMetadata>()
      .notNull()
      .default({}),
  },
  (table) => ({
    startedAtIdx: index("interactions_started_at_idx").on(
      table.startedAt.desc(),
    ),
    statusIdx: index("interactions_status_idx").on(table.status),
    // Partial unique index: only one running interaction per browser session
    // This prevents race conditions when multiple requests try to create interactions
    uniqueRunningBrowserIdx: uniqueIndex("interactions_running_browser_idx")
      .on(sql`(metadata->>'browserId')`)
      .where(sql`status = 'running'`),
  }),
);

/**
 * Interaction Events Table
 *
 * Stores one row per streamed event from the AI SDK.
 * This is an append-only log of everything that happened during an interaction.
 */
export const interactionEvents = pgTable(
  "interaction_events",
  {
    interactionEventId: bigserial("interaction_event_id", { mode: "number" })
      .primaryKey(),
    interactionId: uuid("interaction_id")
      .notNull()
      .references(() => interactions.interactionId, { onDelete: "cascade" }),

    // Ordering within an interaction
    seq: integer("seq").notNull(),

    // Event classification
    role: text("role", {
      enum: ["system", "user", "assistant", "tool"],
    }).notNull(),
    eventFamily: text("event_family", {
      enum: [
        "lifecycle",
        "text",
        "reasoning",
        "tool-input",
        "tool-output",
        "data",
        "error",
      ],
    }).notNull(),
    eventType: text("event_type").notNull(),

    // Event data
    payload: jsonb("payload").notNull(),
    streamId: text("stream_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull()
      .defaultNow(),
  },
  (table) => ({
    interactionSeqIdx: uniqueIndex("interaction_events_interaction_seq_idx").on(
      table.interactionId,
      table.seq,
    ),
    interactionCreatedAtIdx: index(
      "interaction_events_interaction_created_at_idx",
    ).on(
      table.interactionId,
      table.createdAt,
    ),
    eventFamilyIdx: index("interaction_events_event_family_idx").on(
      table.interactionId,
      table.eventFamily,
    ),
  }),
);
