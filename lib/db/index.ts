import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database Client
 *
 * This file exports a configured Drizzle client instance.
 * The client uses the postgres-js driver which works well with Supabase.
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const users = await db.select().from(schema.users);
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please add it to your .env.local file."
  );
}

// Connection configuration
const connectionString = process.env.DATABASE_URL;

// For serverless/edge environments, use a single connection
// For Node.js environments, you can configure connection pooling
const client = postgres(connectionString, {
  // Supabase connection pooler settings
  prepare: false, // Disable prepared statements for compatibility with connection pooler
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for easy access
export { schema };

