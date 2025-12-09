import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Creates a Stagehand instance configured to connect to an existing Kernel browser.
 *
 * @param cdpUrl - Chrome DevTools Protocol WebSocket URL from Kernel browser
 * @returns Initialized Stagehand instance
 * @throws Error if GEMINI_API_KEY environment variable is not set
 * @throws Error if Stagehand initialization fails
 */
export async function createStagehandInstance(cdpUrl: string) {
  // Validate environment variables
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  try {
    // Configure Stagehand to use the existing Kernel browser with Gemini
    // Gemini 2.5 Flash is fast and cost-effective for act/extract/observe operations
    const stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl,
      },
      model: "google/gemini-2.5-flash-lite",
      apiKey: geminiApiKey,
      verbose: 0,
      disablePino: true, // Disable pino logger to prevent thread-stream worker errors
      domSettleTimeout: 30_000,
    });

    // Initialize Stagehand
    await stagehand.init();

    return stagehand;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create Stagehand instance: ${error.message}`);
    }
    throw new Error("Failed to create Stagehand instance: Unknown error");
  }
}

/**
 * Cleans up a Stagehand instance.
 * Note: This does NOT delete the Kernel browser - that should be done separately.
 *
 * @param stagehand - Stagehand instance to close
 */
export async function cleanupStagehandInstance(stagehand: Stagehand) {
  try {
    await stagehand.close();
  } catch (error) {
    console.error("Error closing Stagehand instance:", error);
    throw error;
  }
}
