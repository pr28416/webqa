import { anthropic, AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { ToolLoopAgent, stepCountIs } from "ai";
import { Stagehand } from "@browserbasehq/stagehand";
import {
  createStagehandGotoTool,
  createStagehandActTool,
  createStagehandExtractTool,
  createStagehandObserveTool,
} from "@/lib/tools/stagehand-tools";

/**
 * Creates a chat agent with browser automation and QA capabilities.
 *
 * This agent can:
 * - Answer questions about web QA and browser automation
 * - Provide guidance on using Stagehand for testing
 * - Help with browser instance management
 * - Perform browser actions using Stagehand tools
 *
 * @param stagehand - Initialized Stagehand instance connected to a Kernel browser
 * @returns Configured ToolLoopAgent instance
 */
export function createChatAgent(stagehand: Stagehand) {
  // Create partial tools with Stagehand instance pre-filled
  // This is similar to Python's functools.partial
  const stagehandGotoTool = createStagehandGotoTool(stagehand);
  const stagehandActTool = createStagehandActTool(stagehand);
  const stagehandExtractTool = createStagehandExtractTool(stagehand);
  const stagehandObserveTool = createStagehandObserveTool(stagehand);

  const agent = new ToolLoopAgent({
    model: anthropic("claude-sonnet-4-5-20250929"),
    instructions: `You are an expert web QA and browser automation assistant with access to a live browser.

Your capabilities:
- Control a real browser using natural language through Stagehand tools
- Help users with browser automation and testing workflows
- Extract data from web pages
- Perform actions like clicking, typing, and navigating
- Assist with browser instance management using the Kernel SDK
- Answer questions about Next.js, React, and TypeScript development

Available tools:
- stagehandGoto: Navigate to a URL (required first step)
- stagehandAct: Perform actions on the browser (click, type, etc.)
- stagehandExtract: Extract data from web pages
- stagehandObserve: Preview possible actions before executing

Your communication style:
- Be clear, concise, and helpful
- Use the browser tools when users ask you to interact with web pages
- Provide code examples when relevant
- Explain what you're doing with the browser
- Ask clarifying questions when needed

Always prioritize accuracy and best practices in your responses.`,
    tools: {
      stagehandGoto: stagehandGotoTool,
      stagehandAct: stagehandActTool,
      stagehandExtract: stagehandExtractTool,
      stagehandObserve: stagehandObserveTool,
    },
    prepareStep: async ({ stepNumber }) => {
      // // Force navigation on the first step
      // if (stepNumber === 0) {
      //   return {
      //     toolChoice: { type: "tool", toolName: "stagehandGoto" },
      //   };
      // }

      // After navigation, allow any tool to be used
      return {
        toolChoice: "auto",
        providerOptions: {
          anthropic: {
            sendReasoning: true,
            thinking: { type: "enabled", budgetTokens: 12000 },
          } satisfies AnthropicProviderOptions,
        },
      };
    },
    stopWhen: stepCountIs(30), // Allow up to 30 steps for complex interactions
  });

  return agent;
}

/**
 * Type-safe UIMessage type for the chat agent.
 * Import this type in client components for full type safety.
 */
export type ChatAgentUIMessage = ReturnType<
  typeof createChatAgent
> extends ToolLoopAgent<infer T>
  ? T
  : never;
