import { z } from "zod";
import type { TestExecutionRequest } from "@/types/api";

/**
 * Zod schema for TestExecutionRequest
 * Validates the entire request body structure
 */
export const testExecutionRequestSchema: z.ZodType<TestExecutionRequest> = z
  .object({
    messages: z.array(z.any()), // UIMessage is complex, so we use z.any() for now
    browserId: z.string().min(1, "Browser ID is required"),
    testId: z.string().min(1, "Test ID is required"),
  });
