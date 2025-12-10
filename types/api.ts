import { Test } from "./test";
import { Interaction } from "./test-execution";

/**
 * Common pagination metadata for API responses
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  count: number;
  total?: number;
}

/**
 * Response type for GET /api/tests
 */
export interface TestsResponse extends PaginationMeta {
  tests: Test[];
}

/**
 * Response type for GET /api/executions (interactions)
 */
export interface ExecutionsResponse extends PaginationMeta {
  interactions: Interaction[];
}
