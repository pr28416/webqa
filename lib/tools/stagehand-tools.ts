import { tool } from "ai";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

/**
 * Stagehand Goto Tool
 *
 * Navigates the browser to a specified URL.
 * This is typically the first action in any browser automation workflow.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandGotoTool(stagehand: Stagehand) {
  return tool({
    description: `Navigate the browser to a URL.
Use this tool to visit web pages. Provide absolute URLs (e.g., "https://example.com").
This is usually the first action before performing other browser operations.`,
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe("The URL to navigate to (must be absolute)"),
    }),
    execute: async ({ url }) => {
      try {
        const page = stagehand.context.pages()[0];
        await page.goto(url, {
          waitUntil: "domcontentloaded",
        });
        return {
          success: true,
          message: `Successfully navigated to: ${url}`,
        };
      } catch (error) {
        console.error(`[stagehandGoto] Error navigating to: "${url}"`, error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while navigating",
        };
      }
    },
  });
}

/**
 * Stagehand Act Tool
 *
 * Performs actions on the browser using natural language instructions.
 * Examples: "click the sign in button", "type 'hello' into the search input"
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandActTool(stagehand: Stagehand) {
  return tool({
    description: `Perform actions on the browser using natural language instructions.
Use this tool to interact with web pages: clicking buttons, typing text, selecting options, etc.
Instructions should be atomic and specific (e.g., "click the sign in button").`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe("Natural language instruction for the action to perform"),
    }),
    execute: async ({ instruction }) => {
      try {
        await stagehand.act(instruction);
        return {
          success: true,
          message: `Successfully performed action: ${instruction}`,
        };
      } catch (error) {
        console.error(
          `[stagehandAct] Error executing: "${instruction}"`,
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while performing action",
        };
      }
    },
  });
}

/**
 * Stagehand Extract Tool
 *
 * Extracts data from the browser using natural language instructions.
 * The extraction returns structured data based on what's requested.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandExtractTool(stagehand: Stagehand) {
  return tool({
    description: `Extract data from web pages using natural language instructions.
Use this tool to get information from the current page: text content, form values, links, etc.
Examples: "extract the page title", "get all product prices", "extract the sign in button text"`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe("Natural language instruction for what data to extract"),
    }),
    execute: async ({ instruction }) => {
      try {
        // Extract without a schema returns a default object with 'extraction' field
        const result = await stagehand.extract(instruction);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error(
          `[stagehandExtract] Error executing: "${instruction}"`,
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while extracting data",
        };
      }
    },
  });
}

/**
 * Stagehand Observe Tool
 *
 * Plans actions before executing them by returning candidate actions.
 * Useful for previewing what actions are possible on the current page.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandObserveTool(stagehand: Stagehand) {
  return tool({
    description: `Plan and preview actions on the browser before executing them.
Use this tool to see what actions are available or to understand page elements.
Returns candidate actions that could be performed.`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe("Natural language instruction for what to observe"),
    }),
    execute: async ({ instruction }) => {
      try {
        const actions = await stagehand.observe(instruction);
        return {
          success: true,
          message: `Found ${actions.length} candidate action(s) for: ${instruction}`,
          actions,
        };
      } catch (error) {
        console.error(
          `[stagehandObserve] Error executing: "${instruction}"`,
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while observing actions",
        };
      }
    },
  });
}
