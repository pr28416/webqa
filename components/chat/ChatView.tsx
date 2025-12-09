"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Bot,
  Sparkles,
  Wrench,
  ChevronDown,
  Loader2,
  Check,
  X,
  Navigation,
  MousePointerClick,
  Eye,
  FileSearch,
  StopCircle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserInstance } from "@/types/browser";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatViewProps {
  browserInstance: BrowserInstance | null;
  onStartBrowser: () => Promise<void>;
  onStopBrowser: () => Promise<void>;
  isBrowserLoading: boolean;
}

// Helper to check if value is a record (object with string keys)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Type guards for tool input/output
// These use proper type narrowing - the Record assertion is safe because
// we've already verified it's an object and not null via isRecord()
function hasInstruction(value: unknown): value is { instruction: string } {
  if (!isRecord(value)) {
    return false;
  }

  // Safe to access property after isRecord check
  const instruction = value.instruction;
  return typeof instruction === "string";
}

function hasUrl(value: unknown): value is { url: string } {
  if (!isRecord(value)) {
    return false;
  }

  const url = value.url;
  return typeof url === "string";
}

function isToolPartWithState(part: unknown): part is {
  type: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
} {
  if (!isRecord(part)) {
    return false;
  }

  // Check required properties exist and are strings
  const type = part.type;
  const toolCallId = part.toolCallId;
  const state = part.state;
  return (
    typeof type === "string" &&
    typeof toolCallId === "string" &&
    typeof state === "string"
  );
}

function isToolOutput(
  value: unknown
): value is { success: boolean; message: string } {
  if (!isRecord(value)) {
    return false;
  }

  const success = value.success;
  const message = value.message;
  return typeof success === "boolean" && typeof message === "string";
}

// Tool configuration type
interface ToolConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

// Helper to get tool-specific UI configuration
function getToolConfig(toolName: string, input?: unknown): ToolConfig {
  // Extract instruction from input if available
  const instruction = hasInstruction(input) ? input.instruction : null;

  const urlParam = hasUrl(input) ? input.url : null;

  switch (toolName) {
    case "stagehandGoto":
      return {
        icon: Navigation,
        label: urlParam || "Navigate",
        color: "text-blue-600",
      };
    case "stagehandAct":
      return {
        icon: MousePointerClick,
        label: instruction || "Perform action",
        color: "text-purple-600",
      };
    case "stagehandExtract":
      return {
        icon: FileSearch,
        label: instruction || "Extract data",
        color: "text-orange-600",
      };
    case "stagehandObserve":
      return {
        icon: Eye,
        label: instruction || "Observe elements",
        color: "text-teal-600",
      };
    default:
      return {
        icon: Wrench,
        label: toolName,
        color: "text-muted-foreground",
      };
  }
}

export default function ChatView({
  browserInstance,
  onStartBrowser,
  onStopBrowser,
  isBrowserLoading,
}: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [testInstructions, setTestInstructions] = useState("");
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Use a ref to always get the current browserInstance value
  // This prevents stale closures in prepareSendMessagesRequest
  const browserInstanceRef = useRef(browserInstance);

  // Update ref whenever browserInstance changes
  useEffect(() => {
    browserInstanceRef.current = browserInstance;
  }, [browserInstance]);

  // Create a chat transport with prepareSendMessagesRequest to add browserId
  // Using ref ensures we always get the current browserInstance value
  // Note: The ref is accessed in the callback function (prepareSendMessagesRequest),
  // which is invoked during message sending, not during component render.
  // This is safe and intentional - the ref access happens when the function is called,
  // not when the transport is created.
  const transport = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages, trigger, body }) => {
        const currentBrowserId = browserInstanceRef.current?.id;
        const requestBody = {
          id,
          messages,
          trigger,
          ...body,
          browserId: currentBrowserId,
        };
        console.log("Messages:", messages);
        return { body: requestBody };
      },
    });
  }, []); // Empty dependency array - transport created only once

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport,
  });

  // Reset chat when browser instance ID changes (new session started)
  // We only depend on the ID, not the whole object, to avoid unnecessary resets
  useEffect(() => {
    if (browserInstance?.id) {
      setMessages([]);
    }
  }, [browserInstance?.id, setMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRunTest = async () => {
    const trimmedInstructions = testInstructions.trim();
    if (!trimmedInstructions) {
      return;
    }

    setIsTestRunning(true);

    try {
      // Start browser if not already running
      if (!browserInstance) {
        await onStartBrowser();
      }

      // Send test instructions as a message
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: trimmedInstructions }],
      });
    } catch (error) {
      console.error("Error running test:", error);
      setIsTestRunning(false);
    }
  };

  const handleStopTest = async () => {
    // Stop the chat if it's streaming
    stop();

    // Stop the browser instance
    await onStopBrowser();

    setIsTestRunning(false);
  };

  const isLoading = status === "submitted" || status === "streaming";

  // Update isTestRunning when loading state changes
  useEffect(() => {
    if (!isLoading && isTestRunning && messages.length > 0) {
      // Test finished running
      setIsTestRunning(false);
    }
  }, [isLoading, isTestRunning, messages.length]);

  // Determine test status
  const getTestStatus = () => {
    if (isTestRunning || isLoading) {
      return {
        label: "Running",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      };
    }
    if (
      browserInstance &&
      !isTestRunning &&
      !isLoading &&
      messages.length > 0
    ) {
      return {
        label: "Complete",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      };
    }
    return {
      label: "Ready",
      className:
        "border border-border bg-background text-foreground hover:bg-accent",
    };
  };

  const testStatus = getTestStatus();

  return (
    <div className="flex h-full max-w-full flex-col overflow-hidden">
      {/* Test Instructions Input - Fixed at top */}
      <div className="mb-4 max-w-full shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="test-instructions" className="text-sm font-medium">
            Test Instructions
          </Label>
          <Badge className={`text-xs ${testStatus.className}`}>
            {testStatus.label}
          </Badge>
        </div>
        <Textarea
          id="test-instructions"
          value={testInstructions}
          onChange={(e) => setTestInstructions(e.target.value)}
          placeholder="Enter test instructions for the browser agent..."
          disabled={isTestRunning || isBrowserLoading}
          className="min-h-[100px] resize-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Messages Area - Scrollable, grows to fill space */}
      <div
        ref={scrollAreaRef}
        className="min-h-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden pr-4"
      >
        <div className="max-w-full space-y-6">
          {messages.length === 0 && !isTestRunning && (
            <div className="max-w-full overflow-hidden text-sm text-muted-foreground">
              <p>
                Enter test instructions above and click &quot;Run Test&quot; to
                begin
              </p>
              <p className="mt-1 text-xs opacity-70">
                The agent will execute your instructions in a new browser
                session
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="max-w-full space-y-2">
              {/* Message Header */}
              <div className="flex items-center gap-2 text-xs">
                {message.role === "user" ? (
                  <>
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium">You</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5" />
                    <span className="font-medium">Agent</span>
                  </>
                )}
              </div>

              {/* Message Parts - render in order */}
              <div className="max-w-full space-y-2 pl-5 text-sm">
                {message.parts.map((part, index) => {
                  // Text content
                  if (part.type === "text") {
                    return (
                      <div
                        key={index}
                        className="prose prose-sm max-w-full dark:prose-invert"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    );
                  }

                  // Reasoning/Thinking
                  if (part.type === "reasoning") {
                    return (
                      <div
                        key={index}
                        className="my-2 max-w-full overflow-hidden rounded-md border border-muted bg-muted/30 p-3"
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          Thinking
                        </div>
                        <div className="prose prose-xs max-w-full italic text-muted-foreground dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  }

                  // Tool calls
                  if (part.type.startsWith("tool-")) {
                    if (isToolPartWithState(part)) {
                      const toolPart = part;

                      const toolName = toolPart.type.replace("tool-", "");
                      const isLoading =
                        toolPart.state === "input-streaming" ||
                        toolPart.state === "input-available";

                      // Check if output has success: false
                      const hasSuccessFalse =
                        isRecord(toolPart.output) &&
                        toolPart.output.success === false;

                      const isComplete =
                        toolPart.state === "output-available" &&
                        !toolPart.errorText &&
                        !hasSuccessFalse;
                      const hasError =
                        !!toolPart.errorText ||
                        toolPart.state === "output-error" ||
                        toolPart.state === "output-denied" ||
                        hasSuccessFalse;

                      // Get tool-specific configuration
                      const toolConfig = getToolConfig(
                        toolName,
                        toolPart.input
                      );
                      const ToolIcon = toolConfig.icon;

                      return (
                        <Collapsible
                          key={index}
                          defaultOpen={false}
                          className="my-2 w-full max-w-full"
                        >
                          <div className="w-full max-w-full overflow-hidden rounded-md border border-border bg-background">
                            <CollapsibleTrigger className="flex w-full max-w-full items-center justify-between gap-2 overflow-hidden p-3 text-left text-xs font-medium transition-colors hover:bg-muted/50">
                              <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5 overflow-hidden">
                                <ToolIcon
                                  className={`h-3 w-3 shrink-0 ${toolConfig.color}`}
                                />
                                <span className="min-w-0 flex-1 truncate text-left">
                                  {toolConfig.label}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {isLoading && (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                )}
                                {isComplete && !hasError && (
                                  <Check className="h-3 w-3 text-green-600" />
                                )}
                                {hasError && (
                                  <X className="h-3 w-3 text-destructive" />
                                )}
                                <ChevronDown className="h-3 w-3 transition-transform ui-expanded:rotate-180" />
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="w-full max-w-full overflow-hidden border-t border-border">
                              <div className="max-h-60 w-full max-w-full overflow-y-auto overflow-x-hidden">
                                <div className="w-full max-w-full overflow-hidden p-3">
                                  {/* Render tool-specific content */}
                                  {toolName === "stagehandGoto" && (
                                    <>
                                      {hasUrl(toolPart.input) && (
                                        <div className="mb-3 max-w-full overflow-hidden">
                                          <div className="mb-1 text-xs font-medium text-muted-foreground">
                                            URL:
                                          </div>
                                          <div className="max-w-full overflow-hidden text-xs text-blue-600 wrap-break-word">
                                            {toolPart.input.url}
                                          </div>
                                        </div>
                                      )}
                                      {isToolOutput(toolPart.output) && (
                                        <div className="mb-3 max-w-full overflow-hidden">
                                          <div className="mb-1 text-xs font-medium text-muted-foreground">
                                            Result:
                                          </div>
                                          <div className="max-w-full overflow-hidden text-xs text-green-600 wrap-break-word">
                                            {toolPart.output.message}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Generic rendering for other tools */}
                                  {toolName !== "stagehandGoto" && (
                                    <>
                                      {toolPart.input !== undefined && (
                                        <div className="mb-3 max-w-full overflow-hidden">
                                          <div className="mb-1 text-xs font-medium text-muted-foreground">
                                            Details:
                                          </div>
                                          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
                                            {JSON.stringify(
                                              toolPart.input,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}

                                      {toolPart.output !== undefined && (
                                        <div className="mb-3 max-w-full overflow-hidden">
                                          <div className="mb-1 text-xs font-medium text-muted-foreground">
                                            Result:
                                          </div>
                                          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
                                            {JSON.stringify(
                                              toolPart.output,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Error - common for all tools */}
                                  {toolPart.errorText && (
                                    <div className="max-w-full overflow-hidden rounded bg-destructive/10 p-2 text-xs text-destructive">
                                      <div className="font-medium">Error:</div>
                                      <div className="mt-1 max-w-full overflow-hidden wrap-break-word">
                                        {toolPart.errorText}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    }
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex max-w-full items-center gap-2 overflow-hidden text-xs text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              <span className="font-medium">Agent</span>
              <div className="ml-3 flex gap-1">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:200ms]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:400ms]" />
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-full overflow-hidden rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <div className="font-medium">Error</div>
              <div className="mt-1 text-xs wrap-break-word">
                {error.message}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run/Stop Test Button - Fixed at bottom right */}
      <div className="mt-4 flex max-w-full shrink-0 justify-end">
        {isTestRunning || browserInstance ? (
          <Button
            onClick={handleStopTest}
            disabled={isBrowserLoading}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <StopCircle className="h-5 w-5" />
            Stop Test
          </Button>
        ) : (
          <Button
            onClick={handleRunTest}
            disabled={!testInstructions.trim() || isBrowserLoading}
            size="lg"
            className="gap-2"
          >
            <Play className="h-5 w-5" fill="currentColor" />
            Run Test
          </Button>
        )}
      </div>
    </div>
  );
}
