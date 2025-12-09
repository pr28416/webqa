import { tool, generateText } from "ai";
import {
  Stagehand,
  type ActOptions,
  type ActResult,
  type Action,
} from "@browserbasehq/stagehand";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Re-export Stagehand types for use in other modules
export type { ActOptions, ActResult, Action };

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

USAGE:
  • Always use ABSOLUTE URLs (e.g., "https://example.com", not "example.com")
  • This is typically the FIRST action in any browser automation workflow
  • Wait for DOM content to load before proceeding to other actions

EXAMPLES:
  ✅ "https://www.google.com"
  ✅ "https://github.com/login"
  ✅ "https://example.com/search?q=test"
  ❌ "example.com" (missing protocol)
  ❌ "/search" (relative URL)

INTEGRATION:
  1. Navigate to URL first
  2. Then use act/extract/observe tools for interactions`,
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
 * Supports variables for sensitive data, custom model configuration, and timeouts.
 *
 * Examples:
 * - "click the sign in button"
 * - "type %username% into the email field" (with variables)
 * - "choose 'Peach' from the favorite color dropdown"
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandActTool(stagehand: Stagehand) {
  return tool({
    description: `Perform actions on the browser using natural language instructions.
This tool interacts with web pages: clicking buttons, typing text, selecting options, filling forms, etc.

═══════════════════════════════════════════════════════════════════════════════
USAGE GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

✅ GOOD Instructions (Atomic & Specific):
  • "click the sign in button"
  • "type 'hello world' into the search input"
  • "select 'California' from the state dropdown"
  • "check the terms and conditions checkbox"

❌ BAD Instructions (Multi-step or Vague):
  • "Order me pizza" (too complex, requires multiple steps)
  • "Type in the search bar and hit enter" (multi-step)
  • "Sign in to the website" (multi-step: navigate, type username, type password, click)
  • "Click the button" (too vague, which button?)

═══════════════════════════════════════════════════════════════════════════════
INTEGRATION PATTERNS
═══════════════════════════════════════════════════════════════════════════════

🔄 RECOMMENDED: Observe + Act Pattern (for caching & reliability)
  1. Use stagehandObserve tool to get candidate actions
  2. Cache the action object returned
  3. Execute with stagehandAct using the cached action
  4. Reuse the same cached action for repeated operations
  
  This pattern prevents DOM changes and enables deterministic execution.

🔐 SECURE DATA: Variables Pattern
  • Use %variableName% syntax in instructions for sensitive data
  • Variables are NOT shared with LLM providers (secure by design)
  • Examples:
    - "type %username% into the email field" with variables: { username: "user@example.com" }
    - "type %password% into the password field" with variables: { password: process.env.PASSWORD }
    - "type %apiKey% into the API key input" with variables: { apiKey: process.env.API_KEY }

⏱️ TIMEOUT: Use When Needed
  • Default timeout is usually sufficient
  • Increase timeout (in milliseconds) for:
    - Slow-loading pages or elements
    - Complex interactions requiring more processing time
    - Actions that trigger heavy JavaScript execution
  • Example: timeout: 15000 for 15-second max wait

═══════════════════════════════════════════════════════════════════════════════
AUTO-SUPPORTED FEATURES (No Configuration Needed)
═══════════════════════════════════════════════════════════════════════════════

✓ Iframe interactions - Automatically handles iframe traversal
✓ Shadow DOM elements - Works with shadow DOM out of the box
✓ Self-healing - Actions can adapt to minor DOM changes
✓ Multi-page support - Specify page parameter if needed

═══════════════════════════════════════════════════════════════════════════════
PARAMETERS
═══════════════════════════════════════════════════════════════════════════════

Required:
  • instruction: Natural language action to perform (atomic & specific)

Optional:
  • variables: Secure variable substitution for sensitive data
  • timeout: Max wait time in milliseconds`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Natural language instruction for the action to perform. Use %variableName% for variables."
        ),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Key-value pairs for variable substitution. Use %variableName% in instruction."
        ),
      timeout: z
        .number()
        .positive()
        .optional()
        .describe("Maximum time in milliseconds to wait for action completion"),
    }),
    execute: async ({ instruction, variables, timeout }) => {
      try {
        // Build options object
        const options: ActOptions = {};

        if (variables !== undefined) {
          options.variables = variables;
        }

        if (timeout !== undefined) {
          options.timeout = timeout;
        }

        // Execute the action with options
        const result = await stagehand.act(instruction, options);

        // Return structured ActResult
        return {
          success: result.success,
          message: result.message,
          actionDescription: result.actionDescription,
          actions: result.actions,
        };
      } catch (error) {
        console.error(
          `[stagehandAct] Error executing: "${instruction}"`,
          error
        );

        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while performing action",
          actionDescription: instruction,
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
 * Supports scoped extraction via selectors and timeout configuration.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandExtractTool(stagehand: Stagehand) {
  return tool({
    description: `Extract structured data from web pages using natural language instructions.
Get information from the current page: text, form values, links, tables, lists, product data, etc.

═══════════════════════════════════════════════════════════════════════════════
USAGE PATTERNS
═══════════════════════════════════════════════════════════════════════════════

📝 SIMPLE TEXT EXTRACTION:
  • "extract the page title"
  • "get the sign in button text"
  • "extract the main heading"
  • "get the error message text"
  • "extract the confirmation message"

📊 STRUCTURED DATA (Single Objects):
  • "extract product details including name, price, and availability"
  • "get the user profile information"
  • "extract article metadata with title, author, and date"
  • "get the form field values"

📋 ARRAYS & LISTS:
  • "extract all product listings with names and prices"
  • "get all navigation links with text and URLs"
  • "extract all table rows with names and emails"
  • "get all review ratings and comments"
  • "extract all apartment listings with address, price, and bedrooms"

🔗 URL EXTRACTION:
  • "extract all links on the page with their URLs"
  • "get the href of the 'Learn More' button"
  • "extract the download link URL"
  • "get all navigation menu URLs"

🎯 COMPLEX NESTED DATA:
  • "extract e-commerce data with product name, current price, original price, and reviews"
  • "get nested product information with specifications, pricing, and availability"
  • "extract article with title, metadata, and list of related articles"

═══════════════════════════════════════════════════════════════════════════════
SCOPED EXTRACTION (selector parameter)
═══════════════════════════════════════════════════════════════════════════════

Use the 'selector' parameter to limit extraction to a specific page section:

BENEFITS:
  ✓ Reduces token usage (only processes relevant DOM section)
  ✓ Improves accuracy (focuses on specific content)
  ✓ Faster execution (less data to process)
  ✓ Better for complex pages with multiple sections

WHEN TO USE SELECTOR:
  • Extracting from a specific table, div, or section
  • Page has multiple similar elements, need to target one
  • Want to extract from a specific iframe or shadow DOM element
  • Need to reduce noise from other page content

EXAMPLES:
  • selector: "/html/body/div[2]/div[3]" - Extract from specific div
  • selector: "#product-details" - Extract from element with ID
  • selector: ".pricing-table" - Extract from element with class

═══════════════════════════════════════════════════════════════════════════════
INTEGRATION PATTERNS
═══════════════════════════════════════════════════════════════════════════════

1️⃣ Extract After Navigation:
   goto → extract
   Use: Get data from newly loaded page

2️⃣ Extract After Action:
   act → extract
   Use: Submit form, then extract confirmation message

3️⃣ Extract for Validation:
   act → extract → verify result
   Use: Perform action, extract result, check if successful

4️⃣ Scoped Extraction Workflow:
   goto → extract with selector
   Use: Target specific page section for faster, more accurate extraction

5️⃣ Multi-Step Data Collection:
   goto → extract list → loop (goto each item → extract details)
   Use: Get list of items, then extract detailed info from each

═══════════════════════════════════════════════════════════════════════════════
AUTO-SUPPORTED FEATURES (No Configuration Needed)
═══════════════════════════════════════════════════════════════════════════════

✓ Iframe content - Extracts from iframes automatically
✓ Shadow DOM - Works with shadow DOM elements seamlessly
✓ Dynamic content - Handles JavaScript-rendered content
✓ Type inference - Automatically structures data based on instruction
✓ Array detection - Returns arrays when multiple items requested
✓ URL validation - Properly extracts and formats URLs

═══════════════════════════════════════════════════════════════════════════════
TIMEOUT PARAMETER
═══════════════════════════════════════════════════════════════════════════════

Use timeout (in milliseconds) for:
  • Large pages with heavy content
  • Complex data structures requiring more processing
  • Slow-loading dynamic content
  • Pages with many iframes or shadow DOM elements

Default timeout is usually sufficient for most extractions.

═══════════════════════════════════════════════════════════════════════════════
PARAMETERS
═══════════════════════════════════════════════════════════════════════════════

Required:
  • instruction: Natural language description of what data to extract
    Examples: "extract product price", "get all review comments", "extract user profile data"

Optional:
  • selector: XPath or CSS selector to limit extraction scope (e.g., "/html/body/div[2]")
  • timeout: Max wait time in milliseconds for extraction completion

═══════════════════════════════════════════════════════════════════════════════
RETURN FORMAT
═══════════════════════════════════════════════════════════════════════════════

Simple extraction: { success: true, data: { extraction: "text" } }
Structured data: { success: true, data: { extraction: {...} } } or { extraction: [...] }

The returned data structure automatically matches your instruction:
  • Ask for a single value → get a string or object
  • Ask for multiple items → get an array
  • Ask for complex data → get nested objects`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Natural language instruction for what data to extract. Be specific about the data structure you want."
        ),
      selector: z
        .string()
        .optional()
        .describe(
          "Optional XPath or CSS selector to limit extraction to a specific page section. Improves accuracy and reduces token usage."
        ),
      timeout: z
        .number()
        .positive()
        .optional()
        .describe(
          "Maximum time in milliseconds to wait for extraction completion"
        ),
    }),
    execute: async ({ instruction, selector, timeout }) => {
      try {
        // Build options object with only defined values
        const options: {
          selector?: string;
          timeout?: number;
        } = {};

        if (selector !== undefined) {
          options.selector = selector;
        }

        if (timeout !== undefined) {
          options.timeout = timeout;
        }

        // Extract with options (uses defaultExtractSchema when no schema provided)
        const result = await stagehand.extract(instruction, options);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error(
          `[stagehandExtract] Error executing: "${instruction}"${
            selector ? ` (selector: ${selector})` : ""
          }`,
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
 * Discovers actionable elements and analyzes web page structure.
 * Returns Action objects that can be cached and executed deterministically.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandObserveTool(stagehand: Stagehand) {
  return tool({
    description: `Discover actionable elements and analyze web page structure.
Returns an array of Action objects that can be cached and executed deterministically.

═══════════════════════════════════════════════════════════════════════════════
PRIMARY USE CASE: Action Caching & Planning
═══════════════════════════════════════════════════════════════════════════════

🔄 RECOMMENDED WORKFLOW (Observe → Act Pattern):
  1. Use observe to discover candidate actions
  2. Review and select the appropriate Action object
  3. Cache the Action object for deterministic execution
  4. Execute with act() using the cached Action
  5. Reuse the same cached Action for repeated operations

BENEFITS:
  ✓ Prevents unexpected DOM changes between planning and execution
  ✓ Enables deterministic, reproducible actions (no LLM variability)
  ✓ Faster execution (no LLM call when executing cached action)
  ✓ More reliable for repeated actions in loops
  ✓ Element validation before attempting actions

═══════════════════════════════════════════════════════════════════════════════
USAGE PATTERNS
═══════════════════════════════════════════════════════════════════════════════

🔍 ELEMENT DISCOVERY:
  • "find all clickable buttons"
  • "locate form input fields"
  • "find the login button"
  • "discover all navigation links"
  • "find submit buttons"
  • "locate data tables"

📋 SPECIFIC ELEMENT TYPES:
  • "find all submit buttons"
  • "locate email input field"
  • "find checkbox elements"
  • "discover dropdown menus"
  • "find all interactive elements in the navigation"

🎯 TARGETED DISCOVERY:
  • "find important call-to-action buttons"
  • "locate primary action button"
  • "find required form fields"
  • "discover checkout elements"

═══════════════════════════════════════════════════════════════════════════════
SCOPED OBSERVATION (selector parameter)
═══════════════════════════════════════════════════════════════════════════════

Use the 'selector' parameter to focus observation on a specific page section:

BENEFITS:
  ✓ Reduces search area for faster results
  ✓ Improves accuracy by narrowing context
  ✓ Useful for complex pages with many elements
  ✓ Better for finding elements in specific sections

WHEN TO USE SELECTOR:
  • Observing within a specific table, form, or container
  • Page has multiple similar sections
  • Want to find elements only in a specific area
  • Need to scope search to avoid false positives

EXAMPLES:
  • selector: "/html/body/main/table" - Observe only within table
  • selector: "/html/body/div[2]/form" - Observe only within specific form
  • selector: "#navigation" - Observe only in navigation section

═══════════════════════════════════════════════════════════════════════════════
INTEGRATION PATTERNS
═══════════════════════════════════════════════════════════════════════════════

1️⃣ Observe → Act Workflow:
   observe → select action → act(action)
   Use: Cache and execute deterministic actions

   Example:
   const [loginBtn] = await observe("find login button");
   await act(loginBtn);

2️⃣ Observe → Extract Workflow:
   observe → use selector in extract
   Use: Find element, then extract data from it

   Example:
   const [table] = await observe("find data table");
   await extract("get table data", { selector: table.selector });

3️⃣ Element Validation Workflow:
   observe → check if elements exist
   Use: Verify required elements before proceeding

   Example:
   const forms = await observe("find login form");
   if (forms.length === 0) throw new Error("Form not found");

4️⃣ Iterative Action Workflow:
   observe → loop through actions
   Use: Perform actions on multiple elements

   Example:
   const buttons = await observe("find all checkboxes");
   for (const btn of buttons) await act(btn);

5️⃣ Filter & Select Workflow:
   observe → filter results → select best match
   Use: Get multiple options and choose specific one

   Example:
   const buttons = await observe("find submit buttons");
   const primary = buttons.find(b => b.description.includes('primary'));

═══════════════════════════════════════════════════════════════════════════════
WHEN TO USE OBSERVE
═══════════════════════════════════════════════════════════════════════════════

✅ Use observe when:
  • You need to cache actions for reuse (loops, repeated operations)
  • You want to preview what elements/actions are available
  • You need to validate elements exist before acting
  • You're building a repeatable automation workflow
  • You want deterministic execution without LLM variability
  • You need to filter or select from multiple candidate elements
  • You're working with dynamic pages where element validation is important

⚠️ Skip observe (use act() directly) when:
  • You're performing a simple one-time action
  • You know exactly what action to perform
  • You don't need caching or element validation
  • Speed is critical and you trust the element exists

═══════════════════════════════════════════════════════════════════════════════
AUTO-SUPPORTED FEATURES (No Configuration Needed)
═══════════════════════════════════════════════════════════════════════════════

✓ Iframe elements - Automatically traverses iframes
✓ Shadow DOM - Discovers elements in shadow DOM
✓ Dynamic content - Handles JavaScript-rendered elements
✓ Relevance ordering - Returns results ordered by relevance
✓ Multi-page support - Specify page parameter if needed

═══════════════════════════════════════════════════════════════════════════════
TIMEOUT PARAMETER
═══════════════════════════════════════════════════════════════════════════════

Use timeout (in milliseconds) for:
  • Complex pages with many elements
  • Slow-loading dynamic content
  • Pages with heavy JavaScript processing
  • Large DOM structures requiring more analysis time

Default timeout is usually sufficient for most observations.

═══════════════════════════════════════════════════════════════════════════════
PARAMETERS
═══════════════════════════════════════════════════════════════════════════════

Required:
  • instruction: Natural language description of elements to discover
    Examples: "find all buttons", "locate form fields", "find login button"

Optional:
  • selector: XPath selector to focus observation on specific page section
  • timeout: Max wait time in milliseconds for observation completion

═══════════════════════════════════════════════════════════════════════════════
RETURN VALUE
═══════════════════════════════════════════════════════════════════════════════

Returns: { success: true, message: "...", actions: Action[] }

Each Action object contains:
  • selector: XPath that precisely locates the element
  • description: Human-readable description of element and purpose
  • method: Suggested interaction method ("click", "fill", "type", etc.)
  • arguments: Additional parameters for the action (if applicable)

Results are ordered by relevance - most relevant actions appear first.

USAGE:
  • Use actions[0] for the most relevant result
  • Iterate through all actions to review options
  • Filter actions based on description or method
  • Cache actions for deterministic execution with act()`,
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Natural language description of elements or actions to discover. Be specific about what you're looking for."
        ),
      selector: z
        .string()
        .optional()
        .describe(
          "Optional XPath selector to focus observation on a specific page section. Narrows search area."
        ),
      timeout: z
        .number()
        .positive()
        .optional()
        .describe(
          "Maximum time in milliseconds to wait for observation completion"
        ),
    }),
    execute: async ({ instruction, selector, timeout }) => {
      try {
        // Build options object with only defined values
        const options: {
          selector?: string;
          timeout?: number;
        } = {};

        if (selector !== undefined) {
          options.selector = selector;
        }

        if (timeout !== undefined) {
          options.timeout = timeout;
        }

        // Observe with options
        const actions = await stagehand.observe(instruction, options);

        return {
          success: true,
          message: `Found ${
            actions.length
          } candidate action(s) for: ${instruction}${
            selector ? ` (scoped to: ${selector})` : ""
          }`,
          actions,
        };
      } catch (error) {
        console.error(
          `[stagehandObserve] Error executing: "${instruction}"${
            selector ? ` (selector: ${selector})` : ""
          }`,
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

/**
 * Stagehand Go Back Tool
 *
 * Navigates the browser back to the previous page in history.
 * Equivalent to clicking the browser's back button.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandGoBackTool(stagehand: Stagehand) {
  return tool({
    description: `Navigate back to the previous page in browser history.

USAGE:
  • Equivalent to clicking the browser's back button
  • Useful after navigating to a new page and needing to return
  • Common in workflows: navigate → act → go back → repeat

EXAMPLES:
  • After clicking a link, go back to the original page
  • Return to a list after viewing details
  • Undo accidental navigation

INTEGRATION:
  1. Navigate forward with stagehandGoto or by clicking links
  2. Perform actions or extract data
  3. Use stagehandGoBack to return to previous page
  4. Repeat for iterative workflows

Note: Waits for page to load completely before returning control.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const page = stagehand.context.pages()[0];
        await page.goBack({
          waitUntil: "domcontentloaded",
        });
        return {
          success: true,
          message: "Successfully navigated back to previous page",
        };
      } catch (error) {
        console.error("[stagehandGoBack] Error navigating back", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while navigating back",
        };
      }
    },
  });
}

/**
 * Stagehand Reload Tool
 *
 * Reloads the current page, refreshing all content.
 * Equivalent to clicking the browser's reload button.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandReloadTool(stagehand: Stagehand) {
  return tool({
    description: `Reload the current page to refresh content.

USAGE:
  • Equivalent to pressing F5 or clicking the reload button
  • Refreshes all page content and JavaScript state
  • Useful for dynamic content that updates over time

WHEN TO USE:
  ✅ After performing actions that trigger server-side changes
  ✅ To verify dynamic content updates
  ✅ To reset page state and retry failed actions
  ✅ To check if content has been updated
  ✅ After form submissions that don't redirect

INTEGRATION PATTERNS:

1️⃣ Verify Action Results:
   act (submit form) → reload → extract (verify changes)
   Use: Confirm form submission was successful

2️⃣ Wait for Updates:
   act → wait → reload → extract
   Use: Check for async updates or background processing

3️⃣ Reset & Retry:
   act (fails) → reload → act (retry)
   Use: Clear page state and retry failed operation

Note: Waits for DOM content to load before returning control.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const page = stagehand.context.pages()[0];
        await page.reload({
          waitUntil: "domcontentloaded",
        });
        return {
          success: true,
          message: "Successfully reloaded the page",
        };
      } catch (error) {
        console.error("[stagehandReload] Error reloading page", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while reloading",
        };
      }
    },
  });
}

/**
 * Stagehand Wait Tool
 *
 * Pauses execution for a specified duration.
 * Useful for waiting for animations, async operations, or rate limiting.
 *
 * @param _stagehand - Initialized Stagehand instance (unused - uses setTimeout)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createStagehandWaitTool(_stagehand: Stagehand) {
  return tool({
    description: `Wait for a specified duration before continuing.

USAGE:
  • Pause execution for a specific number of milliseconds
  • Useful for waiting for animations, transitions, or async operations
  • Allows time for dynamic content to load or update

WHEN TO USE:
  ✅ After actions that trigger animations (wait for animation to complete)
  ✅ Between rapid actions to avoid overwhelming the server (rate limiting)
  ✅ Waiting for async operations that don't have visible indicators
  ✅ Allowing time for dynamic content to fully render
  ✅ Debugging: slow down automation to observe behavior

⚠️ PREFER SMART WAITING:
  • Most Stagehand methods (act, extract, observe) wait intelligently
  • Only use explicit wait when necessary
  • For element appearance, use act/observe instead of waiting blindly

INTEGRATION PATTERNS:

1️⃣ Wait for Animation:
   act (trigger animation) → wait (500ms) → extract
   Use: Allow animation to complete before extracting final state

2️⃣ Rate Limiting:
   act → wait (1000ms) → act
   Use: Avoid overwhelming server with rapid requests

3️⃣ Async Operations:
   act (submit) → wait (2000ms) → reload → extract
   Use: Wait for server processing before checking results

4️⃣ Debug/Observe:
   act → wait (3000ms) → observe
   Use: Slow down automation to visually observe behavior

RECOMMENDATIONS:
  • Use shorter waits (100-500ms) for animations
  • Use longer waits (1000-3000ms) for async operations
  • Avoid excessive waits that slow down automation unnecessarily
  • Consider using observe() to verify elements instead of blind waiting`,
    inputSchema: z.object({
      duration: z
        .number()
        .positive()
        .max(30000)
        .describe(
          "Duration to wait in milliseconds (max 30000ms / 30 seconds)"
        ),
    }),
    execute: async ({ duration }) => {
      try {
        // Use a simple Promise-based timeout
        await new Promise((resolve) => setTimeout(resolve, duration));
        return {
          success: true,
          message: `Successfully waited for ${duration}ms`,
        };
      } catch (error) {
        console.error(`[stagehandWait] Error waiting for ${duration}ms`, error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while waiting",
        };
      }
    },
  });
}

/**
 * Stagehand Go Forward Tool
 *
 * Navigates forward in browser history.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandGoForwardTool(stagehand: Stagehand) {
  return tool({
    description: `Navigate forward in browser history (opposite of go back).
Equivalent to clicking the browser's forward button.

Use after going back to return to a more recent page in history.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const page = stagehand.context.pages()[0];
        await page.goForward({
          waitUntil: "domcontentloaded",
        });
        return {
          success: true,
          message: "Successfully navigated forward",
        };
      } catch (error) {
        console.error("[stagehandGoForward] Error navigating forward", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while navigating forward",
        };
      }
    },
  });
}

/**
 * Stagehand Get URL Tool
 *
 * Gets the current page URL.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandGetUrlTool(stagehand: Stagehand) {
  return tool({
    description: `Get the current page URL.

Returns the full URL of the currently loaded page.
Useful for verifying navigation, extracting URL parameters, or confirming page location.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const page = stagehand.context.pages()[0];
        const url = page.url();
        return {
          success: true,
          url,
          message: `Current URL: ${url}`,
        };
      } catch (error) {
        console.error("[stagehandGetUrl] Error getting URL", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while getting URL",
        };
      }
    },
  });
}

/**
 * Stagehand Get Title Tool
 *
 * Gets the current page title.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandGetTitleTool(stagehand: Stagehand) {
  return tool({
    description: `Get the current page title.

Returns the title of the currently loaded page (from the <title> tag).
Useful for verifying page loads, confirming navigation, or extracting page information.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const page = stagehand.context.pages()[0];
        const title = await page.title();
        return {
          success: true,
          title,
          message: `Page title: ${title}`,
        };
      } catch (error) {
        console.error("[stagehandGetTitle] Error getting title", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while getting title",
        };
      }
    },
  });
}

/**
 * Stagehand Screenshot Tool
 *
 * Captures a screenshot of the current page.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandScreenshotTool(stagehand: Stagehand) {
  return tool({
    description: `Capture and analyze a screenshot of the current page using AI vision.

Instead of returning raw image data, this tool analyzes the screenshot and returns a text description based on your query.

REQUIRED:
  • query: What you want to know about the page (e.g., "describe the page contents", "is there a login button?", "what products are visible?")

OPTIONS:
  • fullPage: Capture entire scrollable page (default: false - viewport only)
  • type: Image format - "png" or "jpeg" (default: "jpeg" for efficiency)
  • quality: JPEG quality 0-100 (only for JPEG, default: 40 for speed)

⚠️ WHEN TO USE SCREENSHOTS (Complex Visual Analysis Only):
  ✅ Understanding complex page layouts or visual structure that DOM doesn't capture well
  ✅ Verifying visual appearance of images, charts, graphs, or design elements
  ✅ Analyzing content rendered as images or canvas elements
  ✅ Debugging visual issues or unexpected page states

⚠️ PREFER THESE TOOLS INSTEAD FOR SIMPLE TASKS:
  🚀 For finding and clicking elements: Use stagehandObserve → stagehandAct (FASTEST)
     Example: "Click the login button" → observe() finds it, act() clicks it
  
  🚀 For extracting text content: Use stagehandExtract directly (NO SCREENSHOT NEEDED)
     Example: "Get product names" → extract() reads the DOM

WORKFLOW PATTERNS:
  • Simple interactions: observe() → act()
  • Complex visual analysis: screenshot() → act()
  • Complex visual + planning: screenshot() → observe() → act()

EXAMPLES:
  • query: "Describe the overall visual layout and design of this page"
  • query: "What does the hero image show? What's the visual hierarchy?"
  • query: "Are there any charts or graphs visible? What do they display?"
  • query: "What visual elements indicate the current page state?"

Note: The screenshot is analyzed by AI and discarded to save context. Only the text analysis is returned.`,
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "What you want to know about the screenshot (e.g., 'describe the page', 'is there a login button?')"
        ),
      fullPage: z
        .boolean()
        .optional()
        .describe(
          "Capture entire scrollable page instead of just viewport (default: false)"
        ),
      type: z
        .enum(["png", "jpeg"])
        .optional()
        .describe('Image format: "png" or "jpeg" (default: "jpeg")'),
      quality: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("JPEG quality 0-100 (only used for JPEG, default: 40)"),
    }),
    execute: async ({ query, fullPage, type, quality }) => {
      try {
        const page = stagehand.context.pages()[0];

        // Screenshot options with efficient defaults
        const screenshotType = type || "jpeg";
        const options: {
          fullPage?: boolean;
          type?: "png" | "jpeg";
          quality?: number;
        } = {
          fullPage: fullPage || false,
          type: screenshotType,
        };

        if (screenshotType === "jpeg") {
          options.quality = quality !== undefined ? quality : 40;
        }

        // Capture screenshot
        const buffer = await page.screenshot(options);
        const base64 = buffer.toString("base64");
        const mimeType = screenshotType === "png" ? "image/png" : "image/jpeg";

        const googleGenerativeAI = createGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
        });

        // Analyze screenshot with AI vision (using fast Gemini model)
        const { text: analysis } = await generateText({
          model: googleGenerativeAI("gemini-2.5-flash-lite"),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  image: `data:${mimeType};base64,${base64}`,
                },
                {
                  type: "text",
                  text: query,
                },
              ],
            },
          ],
        });

        return {
          success: true,
          analysis,
          query,
          format: screenshotType,
          fullPage: options.fullPage,
          message: `Screenshot analyzed successfully. Query: "${query}"`,
        };
      } catch (error) {
        console.error(
          "[stagehandScreenshot] Error capturing or analyzing screenshot",
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while capturing or analyzing screenshot",
        };
      }
    },
  });
}

/**
 * Stagehand Set Viewport Tool
 *
 * Sets the browser viewport size.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandSetViewportTool(stagehand: Stagehand) {
  return tool({
    description: `Set the browser viewport size (width and height in pixels).

Changes the visible area of the page. Useful for:
  • Testing responsive designs
  • Simulating mobile/tablet devices
  • Capturing screenshots at specific sizes
  • Testing different screen resolutions

COMMON SIZES:
  • Desktop: 1920x1080, 1366x768, 1440x900
  • Laptop: 1280x720, 1024x768
  • Tablet: 768x1024, 1024x768
  • Mobile: 375x667 (iPhone), 360x640 (Android)

Optional deviceScaleFactor for high-DPI displays (default: 1, use 2 for retina).`,
    inputSchema: z.object({
      width: z
        .number()
        .positive()
        .max(7680)
        .describe("Viewport width in CSS pixels"),
      height: z
        .number()
        .positive()
        .max(4320)
        .describe("Viewport height in CSS pixels"),
      deviceScaleFactor: z
        .number()
        .positive()
        .max(3)
        .optional()
        .describe(
          "Device pixel ratio (1 for normal, 2 for retina, default: 1)"
        ),
    }),
    execute: async ({ width, height, deviceScaleFactor }) => {
      try {
        const page = stagehand.context.pages()[0];
        const options: { deviceScaleFactor?: number } = {};

        if (deviceScaleFactor !== undefined) {
          options.deviceScaleFactor = deviceScaleFactor;
        }

        await page.setViewportSize(width, height, options);

        return {
          success: true,
          viewport: {
            width,
            height,
            deviceScaleFactor: deviceScaleFactor || 1,
          },
          message: `Viewport set to ${width}x${height}${
            deviceScaleFactor ? ` (${deviceScaleFactor}x scale)` : ""
          }`,
        };
      } catch (error) {
        console.error(
          `[stagehandSetViewport] Error setting viewport to ${width}x${height}`,
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while setting viewport",
        };
      }
    },
  });
}

/**
 * Stagehand Evaluate Tool
 *
 * Executes JavaScript code in the page context.
 *
 * @param stagehand - Initialized Stagehand instance
 */
export function createStagehandEvaluateTool(stagehand: Stagehand) {
  return tool({
    description: `Execute JavaScript code in the page context and return the result.

Runs custom JavaScript in the browser and returns JSON-serializable results.

COMMON USES:
  • Get computed styles or element properties
  • Access browser APIs (localStorage, sessionStorage, cookies)
  • Execute custom logic not available through other tools
  • Query or modify the DOM directly
  • Get page state or runtime information

EXAMPLES:
  • "document.body.scrollHeight" - Get page height
  • "localStorage.getItem('token')" - Get localStorage value
  • "window.location.pathname" - Get current path
  • "document.querySelectorAll('img').length" - Count images

IMPORTANT: 
  • Result must be JSON-serializable (no functions, DOM nodes, etc.)
  • Code runs in browser context, not Node.js
  • For complex operations, prefer act/extract/observe tools`,
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "JavaScript code to execute in the page context. Must return JSON-serializable value."
        ),
    }),
    execute: async ({ code }) => {
      try {
        const page = stagehand.context.pages()[0];
        const result = await page.evaluate(code);

        return {
          success: true,
          result,
          message: "JavaScript executed successfully",
        };
      } catch (error) {
        console.error(
          `[stagehandEvaluate] Error executing code: "${code}"`,
          error
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while evaluating JavaScript",
        };
      }
    },
  });
}
