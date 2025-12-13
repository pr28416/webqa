import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

/**
 * Validation error that can be thrown by validation utilities
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates an entire object against a Zod schema.
 * This is useful for validating complete request bodies or complex types.
 *
 * @param value - The value to validate
 * @param schema - A Zod schema to validate against
 * @param errorMessage - Optional custom error message prefix (default: "Validation failed")
 * @param statusCode - Optional HTTP status code for the error (default: 400)
 * @returns The validated and parsed value with proper type narrowing
 * @throws {ValidationError} If validation fails
 *
 * @example
 * ```typescript
 * const TestExecutionRequestSchema = z.object({
 *   messages: z.array(z.any()),
 *   browserId: z.string().min(1),
 *   testId: z.string().min(1),
 * });
 *
 * const requestBody = validateSchema(
 *   await request.json(),
 *   TestExecutionRequestSchema,
 *   "Invalid request body"
 * );
 * // TypeScript now knows requestBody matches the schema type
 * ```
 */
export function validateSchema<T>(
  value: unknown,
  schema: ZodType<T>,
  errorMessage: string = "Validation failed",
  statusCode: number = 400,
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new ValidationError(
        `${errorMessage}: ${details}`,
        statusCode,
      );
    }
    throw new ValidationError(errorMessage, statusCode);
  }
}

/**
 * Converts a ValidationError to a NextResponse for API routes.
 *
 * @param error - The ValidationError to convert
 * @returns A NextResponse with the error message and status code
 */
export function validationErrorToResponse(
  error: ValidationError,
): NextResponse {
  return new NextResponse(JSON.stringify({ error: error.message }), {
    status: error.statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
