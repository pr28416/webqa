import { tests } from "@/lib/db/schema/test-executions";

/**
 * Type-safe representation of a test record
 */
export type Test = typeof tests.$inferSelect;

/**
 * Type for inserting a new test
 */
export type NewTest = typeof tests.$inferInsert;

/**
 * Test metadata that can be stored
 */
export interface TestMetadata {
  tags?: string[];
  description?: string;
  [key: string]: unknown;
}
