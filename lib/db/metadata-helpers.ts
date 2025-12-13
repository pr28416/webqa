import {
  type InteractionMetadata,
  interactionMetadataSchema,
} from "@/types/test-execution";

/**
 * Validates and parses interaction metadata from unknown data.
 * This should be used whenever reading metadata from the database.
 *
 * @param data - Raw metadata data (could be from database JSONB column)
 * @returns Validated InteractionMetadata object
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const interaction = await db.select().from(interactions).where(...);
 * const metadata = parseInteractionMetadata(interaction.metadata);
 * // TypeScript now knows metadata.browserId is string | undefined
 * ```
 */
export function parseInteractionMetadata(
  data: unknown,
): InteractionMetadata {
  return interactionMetadataSchema.parse(data);
}

/**
 * Safely parses interaction metadata with a fallback to empty object.
 * Use this when you want to handle invalid data gracefully.
 *
 * @param data - Raw metadata data (could be from database JSONB column)
 * @param fallback - Optional fallback value (defaults to empty object)
 * @returns Validated InteractionMetadata object or fallback
 *
 * @example
 * ```typescript
 * const metadata = safeParseInteractionMetadata(
 *   interaction.metadata,
 *   { browserId: "default-id" }
 * );
 * ```
 */
export function safeParseInteractionMetadata(
  data: unknown,
  fallback: InteractionMetadata = {},
): InteractionMetadata {
  const result = interactionMetadataSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn(
    "Invalid interaction metadata detected, using fallback:",
    result.error,
  );
  return fallback;
}

/**
 * Validates interaction metadata before writing to database.
 * This ensures type safety and runtime validation before insertion.
 *
 * @param data - Metadata to validate
 * @returns Validated InteractionMetadata object
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const metadata = validateInteractionMetadata({
 *   browserId: "some-id",
 *   repo: "owner/repo",
 * });
 * await db.insert(interactions).values({ metadata, ... });
 * ```
 */
export function validateInteractionMetadata(
  data: unknown,
): InteractionMetadata {
  return interactionMetadataSchema.parse(data);
}

/**
 * Type guard to check if data conforms to InteractionMetadata schema.
 *
 * @param data - Data to check
 * @returns True if data is valid InteractionMetadata
 *
 * @example
 * ```typescript
 * if (isValidInteractionMetadata(someData)) {
 *   // TypeScript now knows someData is InteractionMetadata
 *   console.log(someData.browserId);
 * }
 * ```
 */
export function isValidInteractionMetadata(
  data: unknown,
): data is InteractionMetadata {
  return interactionMetadataSchema.safeParse(data).success;
}
