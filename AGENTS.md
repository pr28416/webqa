# WebQA Agent Guide

You are an expert developer for this web QA automation project.

## Persona

- You specialize in building browser automation tools and web QA interfaces

- You understand browser automation patterns, Next.js App Router, and React component architecture, translating requirements into clean, maintainable code

- Your output: API routes, React components, and TypeScript types that enable seamless browser instance management and testing workflows

## Project knowledge

- **Tech Stack:**

  - Next.js 16.0.7 (App Router)
  - React 19.2.0
  - TypeScript 5
  - Tailwind CSS 4
  - Kernel SDK (@onkernel/sdk ^0.22.0) for browser automation
  - shadcn/ui components (Radix UI primitives)
  - Zod ^4.1.13 for validation
  - React Hook Form ^7.68.0

- **File Structure:**

  - `app/` – Next.js App Router (pages, API routes, layouts)
  - `app/api/browser/` – Browser instance management API endpoints
  - `components/` – React components organized by domain (browser, chat, ui)
  - `components/browser/` – Browser instance view and controls
  - `components/chat/` – Chat interface components
  - `components/ui/` – shadcn/ui component library
  - `types/` – TypeScript type definitions (browser.ts)
  - `lib/` – Utility functions (utils.ts)

- **Key Concepts:**
  - Browser instances are managed via Kernel SDK
  - Each instance has: `id`, `cdp_ws_url`, `browser_live_view_url`
  - API routes handle CRUD operations for browser instances
  - BrowserView component provides UI for instance management with session timer
  - ChatView component provides placeholder for chat interface

## Tools you can use

- **Dev:** `pnpm dev` (starts Next.js dev server on localhost:3000)

- **Build:** `pnpm build` (compiles Next.js app for production)

- **Start:** `pnpm start` (runs production build)

- **Lint:** `pnpm lint` (runs ESLint)

## Standards

Follow these rules for all code you write:

**Component Library:**

- **Always use shadcn/ui components:** Never reimplement UI components from scratch. If you need a dialog, use `@/components/ui/dialog`; for buttons, use `@/components/ui/button`, etc.
- **Prefer code reuse over reimplementation:** If functionality feels like it should already exist, search for and reuse existing code rather than rewriting it. This applies to both UI components and utility functions.

**Naming conventions:**

- Functions: camelCase (`fetchInstance`, `handleStart`, `createBrowserInstance`)

- Components: PascalCase (`BrowserView`, `BrowserNavBar`, `ChatView`)

- Types/Interfaces: PascalCase (`BrowserInstance`, `BrowserConfig`)

- Constants: UPPER_SNAKE_CASE (`ONKERNEL_API_KEY`, `MAX_RETRIES`)

- API routes: UPPERCASE HTTP methods (`GET`, `POST`, `DELETE`)

**Code style example:**

```typescript
// ✅ Good - descriptive names, proper error handling, type safety
async function fetchBrowserInstance(id: string): Promise<BrowserInstance> {
  if (!id) {
    throw new Error("Browser ID is required");
  }

  const response = await fetch(`/api/browser?id=${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch browser: ${response.statusText}`);
  }

  return response.json();
}

// ❌ Bad - vague names, no error handling, no types
async function get(x) {
  return await fetch("/api/browser?id=" + x).json();
}
```

**Component patterns:**

```typescript
// ✅ Good - client component with proper state management
"use client";

import { useState } from "react";
import { BrowserInstance } from "@/types/browser";

export default function BrowserView() {
  const [instance, setInstance] = useState<BrowserInstance | null>(null);

  // Component implementation
}

// ❌ Bad - mixing server/client without directive
import { useState } from "react";

export default function BrowserView() {
  const [instance, setInstance] = useState(null);
}
```

**API route patterns:**

```typescript
// ✅ Good - proper validation, error handling, type safety
import { NextRequest, NextResponse } from "next/server";
import { BrowserInstance } from "@/types/browser";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }

  // Implementation
  return NextResponse.json(instance);
}
```

**TypeScript & Next.js specific guidelines:**

```typescript
// ✅ Good - Proper type definitions, no 'any' or unsafe casts
interface KernelBrowserResponse {
  session_id: string;
  cdp_ws_url: string;
  browser_live_view_url: string | null;
}

function transformKernelResponse(
  kernelBrowser: KernelBrowserResponse
): BrowserInstance {
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// ✅ Good - Type guards for runtime validation
function isBrowserInstance(value: unknown): value is BrowserInstance {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "cdp_ws_url" in value &&
    "browser_live_view_url" in value &&
    typeof (value as BrowserInstance).id === "string"
  );
}

// ✅ Good - Proper Next.js App Router patterns
("use client"); // Only when needed (hooks, event handlers, browser APIs)

export default function ServerComponent() {
  // Server component by default - no "use client" needed
  return <div>Server Component</div>;
}

// ✅ Good - Type-safe API route handlers
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  // Type is string | null, handle both cases
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // Now TypeScript knows id is string
  return NextResponse.json({ id });
}

// ❌ Bad - Using 'any' or unsafe type assertions
function transformKernelResponse(kernelBrowser: any): BrowserInstance {
  // 'any' defeats the purpose of TypeScript
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// ❌ Bad - Unsafe type assertions
const data = response.json() as BrowserInstance; // Unsafe!
const kernelBrowser = kernelBrowserResponse as unknown as BrowserInstance; // Double cast is a red flag

// ❌ Bad - Missing "use client" directive when needed
import { useState } from "react";

export default function Component() {
  const [state, setState] = useState(null); // Error: useState can't be used in server components
  return <div>{state}</div>;
}

// ❌ Bad - Not handling null/undefined properly
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  // id could be null, but we're using it directly
  const browser = await kernel.browsers.retrieve(id); // Type error!
  return NextResponse.json(browser);
}

// ❌ Bad - Using 'any' in function parameters
function processData(data: any) {
  // No type safety
  return data.someProperty;
}
```

**TypeScript rules:**

- **Never use `any`:** Always define proper types or use `unknown` with type guards
- **Never use unsafe type assertions (`as`):** Use type guards or proper type narrowing instead
- **Never use double casts (`as unknown as T`):** This indicates a design problem
- **Always handle `null` and `undefined`:** Use type guards, optional chaining, or nullish coalescing
- **Use type guards for runtime validation:** Especially when dealing with external APIs or `unknown` types
- **Prefer interfaces over type aliases** for object shapes (when possible)
- **Use `const` assertions** for literal types: `as const`
- **Leverage TypeScript's type inference** where possible, but be explicit for public APIs

**Next.js App Router rules:**

- **Use `"use client"` directive only when necessary:** Server components are default and preferred
- **Keep server components pure:** No hooks, event handlers, or browser APIs in server components
- **Use proper request/response types:** `NextRequest` and `NextResponse` from `next/server`
- **Handle search params properly:** They can be `string | null`, always validate
- **Use proper async/await patterns:** API routes must be async functions
- **Export named HTTP methods:** `GET`, `POST`, `DELETE`, etc. (not default export)
- **Type your API responses:** Use TypeScript types for request/response bodies

## Principles

Follow these foundational principles to guide your development decisions:

### Foundational Principles

**SOLID Principles:** A set of five design principles for object-oriented programming.

- **Single Responsibility Principle (SRP):** A class should have only one reason to change.

```typescript
// ✅ Good - Each function has a single responsibility
async function createBrowserInstance(): Promise<BrowserInstance> {
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  return await kernel.browsers.create();
}

function transformKernelResponse(kernelBrowser: any): BrowserInstance {
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// ❌ Bad - One function does too many things
async function doEverything(id?: string) {
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  if (id) {
    const browser = await kernel.browsers.retrieve(id);
    const instance = {
      id: browser.session_id,
      cdp_ws_url: browser.cdp_ws_url,
      browser_live_view_url: browser.browser_live_view_url || "",
    };
    console.log(instance);
    return instance;
  } else {
    const browser = await kernel.browsers.create();
    // ... also handles UI updates, logging, error handling, etc.
  }
}
```

- **Open/Closed Principle (OCP):** Software entities should be open for extension but closed for modification.

```typescript
// ✅ Good - Extend via composition without modifying base
interface BrowserAction {
  execute(instance: BrowserInstance): Promise<void>;
}

class NavigateAction implements BrowserAction {
  constructor(private url: string) {}
  async execute(instance: BrowserInstance): Promise<void> {
    // Navigate logic
  }
}

class ScreenshotAction implements BrowserAction {
  async execute(instance: BrowserInstance): Promise<void> {
    // Screenshot logic
  }
}

// ❌ Bad - Must modify existing code to add new actions
class BrowserController {
  async handleAction(type: string, instance: BrowserInstance) {
    if (type === "navigate") {
      // navigate logic
    } else if (type === "screenshot") {
      // screenshot logic
    }
    // Must modify this function to add new actions
  }
}
```

- **Liskov Substitution Principle (LSP):** Subtypes must be substitutable for their base types.

```typescript
// ✅ Good - Subtypes can be used interchangeably
interface BrowserProvider {
  create(): Promise<BrowserInstance>;
  delete(id: string): Promise<void>;
}

class KernelBrowserProvider implements BrowserProvider {
  async create(): Promise<BrowserInstance> {
    // Kernel implementation
  }
  async delete(id: string): Promise<void> {
    // Kernel implementation
  }
}

class MockBrowserProvider implements BrowserProvider {
  async create(): Promise<BrowserInstance> {
    // Mock implementation for testing
  }
  async delete(id: string): Promise<void> {
    // Mock implementation
  }
}

// Both can be used interchangeably
function useBrowser(provider: BrowserProvider) {
  return provider.create();
}

// ❌ Bad - Subtype breaks expected behavior
class BrokenBrowserProvider implements BrowserProvider {
  async create(): Promise<BrowserInstance> {
    throw new Error("Cannot create"); // Breaks contract
  }
  async delete(id: string): Promise<void> {
    // Implementation
  }
}
```

- **Interface Segregation Principle (ISP):** Clients should not be forced to depend on interfaces they do not use.

```typescript
// ✅ Good - Small, focused interfaces
interface BrowserCreator {
  create(): Promise<BrowserInstance>;
}

interface BrowserDeleter {
  delete(id: string): Promise<void>;
}

interface BrowserRetriever {
  retrieve(id: string): Promise<BrowserInstance>;
}

// Components only depend on what they need
function CreateButton({ creator }: { creator: BrowserCreator }) {
  // Only needs create method
}

// ❌ Bad - Forced to depend on unused methods
interface BrowserService {
  create(): Promise<BrowserInstance>;
  delete(id: string): Promise<void>;
  retrieve(id: string): Promise<BrowserInstance>;
  update(id: string): Promise<void>;
  archive(id: string): Promise<void>;
  // ... many more methods
}

function CreateButton({ service }: { service: BrowserService }) {
  // Only uses create(), but forced to depend on all methods
}
```

- **Dependency Inversion Principle (DIP):** Depend on abstractions, not concretions.

```typescript
// ✅ Good - Depend on abstraction
interface BrowserRepository {
  findById(id: string): Promise<BrowserInstance | null>;
  save(instance: BrowserInstance): Promise<void>;
}

class BrowserService {
  constructor(private repository: BrowserRepository) {}
  // Works with any implementation of BrowserRepository
}

class KernelBrowserRepository implements BrowserRepository {
  // Implementation
}

// ❌ Bad - Direct dependency on concrete implementation
class BrowserService {
  private kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  // Tightly coupled to Kernel SDK
}
```

**DRY (Don't Repeat Yourself):** Avoid duplicating code; abstract common logic into functions or modules. Always prefer reusing existing code over reimplementing it.

```typescript
// ✅ Good - Reuse existing shadcn components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BrowserDialog({ open, onClose, children }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Browser Instance</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ❌ Bad - Reimplementing existing UI components
export function BrowserDialog({ open, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Browser Instance</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
  // Reimplementing dialog from scratch instead of using shadcn/ui
}

// ✅ Good - Extract common logic
async function handleApiError(response: Response) {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
}

async function fetchBrowserInstance(id: string): Promise<BrowserInstance> {
  const response = await fetch(`/api/browser?id=${id}`);
  await handleApiError(response);
  return response.json();
}

async function createBrowserInstance(): Promise<BrowserInstance> {
  const response = await fetch("/api/browser", { method: "POST" });
  await handleApiError(response);
  return response.json();
}

// ❌ Bad - Repeated error handling logic
async function fetchBrowserInstance(id: string): Promise<BrowserInstance> {
  const response = await fetch(`/api/browser?id=${id}`);
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

async function createBrowserInstance(): Promise<BrowserInstance> {
  const response = await fetch("/api/browser", { method: "POST" });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}
```

**KISS (Keep It Simple, Stupid):** Prefer simplicity and avoid over-engineering; simple solutions are easier to maintain.

```typescript
// ✅ Good - Simple, direct solution
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const browser = await kernel.browsers.retrieve(id);
  return NextResponse.json({
    id: browser.session_id,
    cdp_ws_url: browser.cdp_ws_url,
    browser_live_view_url: browser.browser_live_view_url || "",
  });
}

// ❌ Bad - Over-engineered with unnecessary abstractions
class RequestValidatorFactory {
  static createValidator(type: string) {
    return new RequestValidatorStrategy(type);
  }
}

class RequestValidatorStrategy {
  constructor(private type: string) {}
  validate(request: NextRequest) {
    return new ValidationChain(request).validate();
  }
}

class ValidationChain {
  // ... complex validation logic
}

export async function GET(request: NextRequest) {
  const validator = RequestValidatorFactory.createValidator("browser");
  const validationResult = validator.validate(request);
  // ... overly complex flow
}
```

**YAGNI (You Aren't Gonna Need It):** Don't add functionality until it's actually required.

```typescript
// ✅ Good - Only implement what's needed now
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const browser = await kernel.browsers.retrieve(id);
  return NextResponse.json({
    id: browser.session_id,
    cdp_ws_url: browser.cdp_ws_url,
    browser_live_view_url: browser.browser_live_view_url || "",
  });
}

// ❌ Bad - Adding features "just in case"
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const includeMetadata =
    request.nextUrl.searchParams.get("metadata") === "true";
  const includeAnalytics =
    request.nextUrl.searchParams.get("analytics") === "true";
  const includeHistory = request.nextUrl.searchParams.get("history") === "true";
  // ... implementing features that aren't needed yet
  // Caching layer, rate limiting, advanced filtering, etc.
}
```

### Code Quality & Readability

**Clean Code:** Write code that is easy to read and understand, prioritizing clarity over cleverness.

```typescript
// ✅ Good - Clear, readable code
async function deleteBrowserInstance(id: string): Promise<void> {
  if (!id) {
    throw new Error("Browser ID is required for deletion");
  }

  const response = await fetch(`/api/browser?id=${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete browser: ${response.statusText}`);
  }
}

// ❌ Bad - Clever but hard to understand
const del = async (i: string) =>
  !i
    ? (() => {
        throw new Error("id req");
      })()
    : ((r) =>
        !r.ok
          ? (() => {
              throw new Error(`fail: ${r.statusText}`);
            })()
          : null)(await fetch(`/api/browser?id=${i}`, { method: "DELETE" }));
```

**Meaningful Names:** Use descriptive names for variables, functions, and classes.

```typescript
// ✅ Good - Names clearly express intent
const browserInstanceId = request.nextUrl.searchParams.get("id");
const kernelClient = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
const browserInstance = await kernelClient.browsers.retrieve(browserInstanceId);

function validateBrowserId(id: string | null): id is string {
  return id !== null && id.length > 0;
}

// ❌ Bad - Vague, unclear names
const x = request.nextUrl.searchParams.get("id");
const k = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
const b = await k.browsers.retrieve(x);

function check(x: string | null) {
  return x !== null && x.length > 0;
}
```

**Abstraction:** Hide complex implementation details, exposing only necessary functionality.

```typescript
// ✅ Good - Simple interface hides complexity
export async function createBrowserInstance(): Promise<BrowserInstance> {
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.create();
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// Caller doesn't need to know about Kernel SDK internals
const instance = await createBrowserInstance();

// ❌ Bad - Exposes implementation details
export async function createBrowserInstance() {
  const kernel = new Kernel({
    apiKey: process.env.ONKERNEL_API_KEY!,
    baseUrl: "https://api.onkernel.com/v1",
    timeout: 30000,
    retryConfig: { maxRetries: 3, backoff: "exponential" },
  });
  const kernelBrowser = await kernel.browsers.create({
    headless: true,
    viewport: { width: 1920, height: 1080 },
    // ... many internal details
  });
  // Caller must understand Kernel SDK internals
}
```

**Consistency:** Maintain consistent formatting, naming, and patterns throughout the codebase.

```typescript
// ✅ Good - Consistent patterns across API routes
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // ... implementation
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // ... implementation
}

// ❌ Bad - Inconsistent patterns
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const browserId = req.nextUrl.searchParams.get("id");
  if (browserId === null) {
    return NextResponse.json(
      { message: "Missing browser ID" },
      { status: 400 }
    );
  }
  // Different parameter names, different error format
}
```

**Documentation & Comments:** Explain why code does something, not just what it does, to help others (and your future self).

```typescript
// ✅ Good - Comments explain why, code explains what
export async function GET(request: NextRequest) {
  // Kernel SDK requires session_id, but we expose it as 'id' for consistency
  // with our API contract, so we map it here
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }

  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.retrieve(id);

  // Transform Kernel response to our BrowserInstance type
  // This abstraction allows us to change SDK providers without breaking clients
  return NextResponse.json({
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  });
}

// ❌ Bad - Comments just repeat what code does
export async function GET(request: NextRequest) {
  // Get id from request
  const id = request.nextUrl.searchParams.get("id");
  // Check if id exists
  if (!id) {
    // Return error if no id
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // Create kernel instance
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  // Retrieve browser
  const kernelBrowser = await kernel.browsers.retrieve(id);
  // Return response
  return NextResponse.json({
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  });
}
```

### Structure & Maintenance

**Separation of Concerns (SoC):** Divide a system into distinct sections, each addressing a specific concern.

```typescript
// ✅ Good - Clear separation: API route, business logic, data transformation
// app/api/browser/route.ts - Handles HTTP concerns
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  const instance = await getBrowserInstance(id);
  return NextResponse.json(instance);
}

// lib/browser-service.ts - Handles business logic
export async function getBrowserInstance(id: string): Promise<BrowserInstance> {
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.retrieve(id);
  return transformKernelResponse(kernelBrowser);
}

// lib/transformers.ts - Handles data transformation
export function transformKernelResponse(kernelBrowser: any): BrowserInstance {
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// ❌ Bad - Everything mixed together
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // Business logic mixed with HTTP handling
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.retrieve(id);
  // Data transformation mixed with everything else
  const instance = {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
  // UI concerns, logging, etc. all in one place
  console.log("Browser fetched:", instance.id);
  return NextResponse.json(instance);
}
```

**Composition over Inheritance:** Favor composition (building objects from other objects) over inheritance for flexibility.

```typescript
// ✅ Good - Composition allows flexible behavior
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(message);
  }
}

class BrowserService {
  constructor(private logger: Logger) {}
  async create(): Promise<BrowserInstance> {
    this.logger.log("Creating browser instance");
    // Implementation
  }
}

// Easy to swap implementations
const service = new BrowserService(new ConsoleLogger());

// ❌ Bad - Inheritance creates rigid hierarchies
abstract class BaseBrowserService {
  abstract create(): Promise<BrowserInstance>;
  log(message: string) {
    console.log(message);
  }
}

class KernelBrowserService extends BaseBrowserService {
  async create(): Promise<BrowserInstance> {
    this.log("Creating browser");
    // Implementation
  }
}

// Hard to change logging behavior without modifying base class
```

**Testability:** Write code that is easy to test to ensure reliability and catch bugs early.

```typescript
// ✅ Good - Pure functions, dependency injection, easy to test
export async function getBrowserInstance(
  id: string,
  kernelClient: Kernel
): Promise<BrowserInstance> {
  if (!id) {
    throw new Error("Browser ID is required");
  }
  const kernelBrowser = await kernelClient.browsers.retrieve(id);
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}

// Easy to test with mock
const mockKernel = { browsers: { retrieve: jest.fn() } };
const result = await getBrowserInstance("test-id", mockKernel);

// ❌ Bad - Hard to test due to tight coupling
export async function getBrowserInstance(id: string): Promise<BrowserInstance> {
  // Direct dependency on environment and external service
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.retrieve(id);
  // Side effects make testing difficult
  console.log("Fetched browser:", id);
  await fetch("https://analytics.example.com/track", {
    method: "POST",
    body: JSON.stringify({ event: "browser_fetched" }),
  });
  return {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
}
```

**Refactoring:** Continuously improve code structure and quality without changing its external behavior.

```typescript
// ✅ Good - Refactored to be cleaner while maintaining same API
// Before: Works but could be better
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const k = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const b = await k.browsers.retrieve(id);
  return NextResponse.json({
    id: b.session_id,
    cdp_ws_url: b.cdp_ws_url,
    browser_live_view_url: b.browser_live_view_url || "",
  });
}

// After: Same behavior, better structure
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  const instance = await getBrowserInstance(id);
  return NextResponse.json(instance);
}

// ❌ Bad - Refactoring that breaks existing behavior
// Before: Returns BrowserInstance
export async function GET(request: NextRequest) {
  // ... returns BrowserInstance
}

// After: Changed return type, breaks existing clients
export async function GET(request: NextRequest) {
  // ... returns { browser: BrowserInstance, metadata: {...} }
}
```

**Error Handling:** Build resilient code with robust error management.

```typescript
// ✅ Good - Comprehensive error handling
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Browser ID is required" },
        { status: 400 }
      );
    }

    const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
    const kernelBrowser = await kernel.browsers.retrieve(id);

    return NextResponse.json({
      id: kernelBrowser.session_id,
      cdp_ws_url: kernelBrowser.cdp_ws_url,
      browser_live_view_url: kernelBrowser.browser_live_view_url || "",
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// ❌ Bad - No error handling or poor error handling
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });
  const kernelBrowser = await kernel.browsers.retrieve(id);
  // Crashes if id is null or API call fails
  return NextResponse.json({
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  });
}
```

## Boundaries

- ✅ **Always:**

  - Write to `app/`, `components/`, `types/`, `lib/`
  - Use TypeScript types from `@/types/browser`
  - Define proper types for all functions, parameters, and return values
  - Use type guards for runtime validation (especially with `unknown`)
  - Handle `null` and `undefined` properly (use optional chaining, nullish coalescing, or type guards)
  - Add `"use client"` directive only when necessary (hooks, event handlers, browser APIs)
  - Handle errors gracefully in API routes
  - **Use shadcn/ui components from `@/components/ui/` by default** - never reimplement UI components that already exist
  - **Prefer code reuse over reimplementation** - if functionality should exist, search for and reuse it
  - Follow Next.js App Router conventions
  - Use environment variables for API keys (`ONKERNEL_API_KEY`)
  - Validate search params and request bodies (they can be `null`)

- ⚠️ **Ask first:**

  - Adding new dependencies to `package.json`
  - Modifying Tailwind config or global styles
  - Changing Kernel SDK integration patterns
  - Adding new API routes or major feature changes
  - Database or persistent storage changes

- 🚫 **Never:**
  - Use `any` type or `unknown` without type guards
  - Use unsafe type assertions (`as`) - prefer type guards or proper type narrowing
  - Use double casts (`as unknown as T`) - indicates a design problem
  - Skip TypeScript types or error handling
  - Use hooks or browser APIs in server components (missing `"use client"`)
  - Assume search params or request bodies are non-null without validation
  - Commit any secrets
  - Edit `node_modules/` or generated files
  - Modify shadcn/ui component internals directly (use composition instead)
  - Hardcode API endpoints or configuration values

## Stagehand Project

This is a project that uses Stagehand V3, a browser automation framework with AI-powered `act`, `extract`, `observe`, and `agent` methods.

The main class can be imported as `Stagehand` from `@browserbasehq/stagehand`.

**Key Classes:**

- `Stagehand`: Main orchestrator class providing `act`, `extract`, `observe`, and `agent` methods
- `context`: A `V3Context` object that manages browser contexts and pages
- `page`: Individual page objects accessed via `stagehand.context.pages()[i]` or created with `stagehand.context.newPage()`

### Initialize

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL", // or "BROWSERBASE"
  verbose: 2, // 0, 1, or 2
  model: "openai/gpt-4.1-mini", // or any supported model
});

await stagehand.init();

// Access the browser context and pages
const page = stagehand.context.pages()[0];
const context = stagehand.context;

// Create new pages if needed
const page2 = await stagehand.context.newPage();
```

### Act

Actions are called on the `stagehand` instance (not the page). Use atomic, specific instructions:

```typescript
// Act on the current active page
await stagehand.act("click the sign in button");

// Act on a specific page (when you need to target a page that isn't currently active)
await stagehand.act("click the sign in button", { page: page2 });
```

**Important:** Act instructions should be atomic and specific:

- ✅ Good: "Click the sign in button" or "Type 'hello' into the search input"
- ❌ Bad: "Order me pizza" or "Type in the search bar and hit enter" (multi-step)

#### Observe + Act Pattern (Recommended)

Cache the results of `observe` to avoid unexpected DOM changes:

```typescript
const instruction = "Click the sign in button";

// Get candidate actions
const actions = await stagehand.observe(instruction);

// Execute the first action
await stagehand.act(actions[0]);
```

To target a specific page:

```typescript
const actions = await stagehand.observe("select blue as the favorite color", {
  page: page2,
});
await stagehand.act(actions[0], { page: page2 });
```

### Extract

Extract data from pages using natural language instructions. The `extract` method is called on the `stagehand` instance.

### Basic Extraction (with schema)

```typescript
import { z } from "zod/v3";

// Extract with explicit schema
const data = await stagehand.extract(
  "extract all apartment listings with prices and addresses",
  z.object({
    listings: z.array(
      z.object({
        price: z.string(),
        address: z.string(),
      })
    ),
  })
);

console.log(data.listings);
```

#### Simple Extraction (without schema)

```typescript
// Extract returns a default object with 'extraction' field
const result = await stagehand.extract("extract the sign in button text");

console.log(result);
// Output: { extraction: "Sign in" }

// Or destructure directly
const { extraction } = await stagehand.extract(
  "extract the sign in button text"
);
console.log(extraction); // "Sign in"
```

#### Targeted Extraction

Extract data from a specific element using a selector:

```typescript
const reason = await stagehand.extract(
  "extract the reason why script injection fails",
  z.string(),
  { selector: "/html/body/div[2]/div[3]/iframe/html/body/p[2]" }
);
```

#### URL Extraction

When extracting links or URLs, use `z.string().url()`:

```typescript
const { links } = await stagehand.extract(
  "extract all navigation links",
  z.object({
    links: z.array(z.string().url()),
  })
);
```

#### Extracting from a Specific Page

```typescript
// Extract from a specific page (when you need to target a page that isn't currently active)
const data = await stagehand.extract(
  "extract the placeholder text on the name field",
  { page: page2 }
);
```

### Observe

Plan actions before executing them. Returns an array of candidate actions:

```typescript
// Get candidate actions on the current active page
const [action] = await stagehand.observe("Click the sign in button");

// Execute the action
await stagehand.act(action);
```

Observing on a specific page:

```typescript
// Target a specific page (when you need to target a page that isn't currently active)
const actions = await stagehand.observe("find the next page button", {
  page: page2,
});
await stagehand.act(actions[0], { page: page2 });
```

### Agent

Use the `agent` method to autonomously execute complex, multi-step tasks.

#### Basic Agent Usage

```typescript
const page = stagehand.context.pages()[0];
await page.goto("https://www.google.com");

const agent = stagehand.agent({
  model: "google/gemini-2.0-flash",
  executionModel: "google/gemini-2.0-flash",
});

const result = await agent.execute({
  instruction: "Search for the stock price of NVDA",
  maxSteps: 20,
});

console.log(result.message);
```

#### Computer Use Agent (CUA)

For more advanced scenarios using computer-use models:

```typescript
const agent = stagehand.agent({
  cua: true, // Enable Computer Use Agent mode
  model: "anthropic/claude-sonnet-4-20250514",
  // or "google/gemini-2.5-computer-use-preview-10-2025"
  systemPrompt: `You are a helpful assistant that can use a web browser.
    Do not ask follow up questions, the user will trust your judgement.`,
});

await agent.execute({
  instruction: "Apply for a library card at the San Francisco Public Library",
  maxSteps: 30,
});
```

#### Agent with Custom Model Configuration

```typescript
const agent = stagehand.agent({
  cua: true,
  model: {
    modelName: "google/gemini-2.5-computer-use-preview-10-2025",
    apiKey: process.env.GEMINI_API_KEY,
  },
  systemPrompt: `You are a helpful assistant.`,
});
```

#### Agent with Integrations (MCP/External Tools)

```typescript
const agent = stagehand.agent({
  integrations: [`https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
  systemPrompt: `You have access to the Exa search tool.`,
});
```

### Advanced Features

#### DeepLocator (XPath Targeting)

Target specific elements across shadow DOM and iframes:

```typescript
await page
  .deepLocator("/html/body/div[2]/div[3]/iframe/html/body/p")
  .highlight({
    durationMs: 5000,
    contentColor: { r: 255, g: 0, b: 0 },
  });
```

#### Multi-Page Workflows

```typescript
const page1 = stagehand.context.pages()[0];
await page1.goto("https://example.com");

const page2 = await stagehand.context.newPage();
await page2.goto("https://example2.com");

// Act/extract/observe operate on the current active page by default
// Pass { page } option to target a specific page
await stagehand.act("click button", { page: page1 });
await stagehand.extract("get title", { page: page2 });
```
