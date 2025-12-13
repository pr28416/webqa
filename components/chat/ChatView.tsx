"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIDataTypes, UIMessage, UITools } from "ai";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import type { TestExecutionRequest } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatViewProps {
  browserInstance: BrowserInstance | null;
  onStartBrowser: () => Promise<void>;
  onStopBrowser: () => Promise<void>;
  isBrowserLoading: boolean;
  initialInstructions?: string;
  testTitle?: string;
  onTitleChange?: (title: string) => void;
  onInstructionsChange?: (instructions: string) => void;
  showTitleInput?: boolean;
  hideRunButton?: boolean;
  readOnly?: boolean;
  testId?: string;
  initialMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
}

export interface ChatViewRef {
  runTest: () => Promise<void>;
  stopTest: () => void;
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
        color: "text-amber-600",
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

const ChatView = forwardRef<ChatViewRef, ChatViewProps>(
  (
    {
      browserInstance,
      onStartBrowser,
      onStopBrowser,
      isBrowserLoading,
      initialInstructions = "",
      testTitle,
      onTitleChange,
      onInstructionsChange,
      showTitleInput = false,
      hideRunButton = false,
      readOnly = false,
      testId,
      initialMessages,
    },
    ref
  ) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [testInstructions, setTestInstructions] =
      useState(initialInstructions);
    const [isTestRunning, setIsTestRunning] = useState(false);

    // Update test instructions when initialInstructions changes
    useEffect(() => {
      setTestInstructions(initialInstructions);
    }, [initialInstructions]);

    // Handle instructions change
    const handleInstructionsChange = (value: string) => {
      if (readOnly) return;
      setTestInstructions(value);
      onInstructionsChange?.(value);
    };

    // Use a ref to always get the current browserInstance value
    // This prevents stale closures in prepareSendMessagesRequest
    const browserInstanceRef = useRef(browserInstance);
    const testIdRef = useRef(testId);

    // Update refs whenever values change
    useEffect(() => {
      browserInstanceRef.current = browserInstance;
    }, [browserInstance]);

    useEffect(() => {
      testIdRef.current = testId;
    }, [testId]);

    // Create a chat transport with prepareSendMessagesRequest to add browserId and testId
    // Using refs ensures we always get the current values
    // Note: The refs are accessed in the callback function (prepareSendMessagesRequest),
    // which is invoked during message sending, not during component render.
    // This is safe and intentional - the ref access happens when the function is called,
    // not when the transport is created.
    const transport = useMemo(() => {
      // eslint-disable-next-line react-hooks/refs
      return new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const currentBrowserId = browserInstanceRef.current?.id;
          const currentTestId = testIdRef.current;

          if (!currentBrowserId) {
            throw new Error("Browser instance is required to send messages");
          }

          if (!currentTestId) {
            throw new Error("Test ID is required to send messages");
          }

          const requestBody: TestExecutionRequest = {
            messages,
            browserId: currentBrowserId,
            testId: currentTestId,
          };
          console.log("Messages:", messages);
          return { body: requestBody };
        },
      });
    }, []); // Empty dependency array - transport created only once

    const { messages, sendMessage, status, error, setMessages, stop } = useChat(
      {
        transport,
      }
    );

    // Set initial messages when in read-only mode
    useEffect(() => {
      if (
        readOnly &&
        initialMessages &&
        initialMessages.length > 0 &&
        messages.length === 0
      ) {
        // initialMessages are already in AI SDK UIMessage format
        setMessages(initialMessages);
      }
    }, [readOnly, initialMessages, setMessages, messages.length]);

    // Reset chat when browser instance ID changes (new session started)
    // We only depend on the ID, not the whole object, to avoid unnecessary resets
    useEffect(() => {
      if (browserInstance?.id && !readOnly) {
        setMessages([]);
      }
    }, [browserInstance?.id, setMessages, readOnly]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, [messages]);

    // Track if we've already stopped the browser to prevent duplicate stops
    const hasAutoStoppedRef = useRef(false);

    // Reset auto-stop flag when a new test starts running
    useEffect(() => {
      if (isTestRunning) {
        hasAutoStoppedRef.current = false;
      }
    }, [isTestRunning]);

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

        // Clear all existing messages before sending new one
        // This ensures only the current user message is sent to the API
        setMessages([]);

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
      // Prevent duplicate stop calls (manual + auto-stop effect)
      if (hasAutoStoppedRef.current) {
        console.log("Browser already stopped, skipping");
        return;
      }
      hasAutoStoppedRef.current = true;

      // Stop the chat if it's streaming
      stop();

      // Mark interaction as canceled if browser instance exists
      if (browserInstance?.id) {
        try {
          await fetch("/api/executions/cancel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ browserId: browserInstance.id }),
          });
        } catch (error) {
          console.error("Error marking interaction as canceled:", error);
          // Continue even if this fails - we still want to stop the browser
        }
      }

      // Stop the browser instance
      await onStopBrowser();

      setIsTestRunning(false);
    };

    // Expose runTest and stopTest methods to parent via ref
    useImperativeHandle(ref, () => ({
      runTest: handleRunTest,
      stopTest: handleStopTest,
    }));

    const isLoading = status === "submitted" || status === "streaming";

    // Update isTestRunning when loading state changes and auto-stop browser
    useEffect(() => {
      if (!isLoading && isTestRunning && messages.length > 0) {
        // Test finished running
        setIsTestRunning(false);

        // Auto-stop browser when test finishes (but not in read-only mode)
        if (!readOnly && browserInstance && !hasAutoStoppedRef.current) {
          hasAutoStoppedRef.current = true;
          // Test has finished - automatically stop the browser
          onStopBrowser().catch((error) => {
            console.error(
              "Error auto-stopping browser after test completion:",
              error
            );
          });
        }
      }
    }, [
      isLoading,
      isTestRunning,
      messages.length,
      browserInstance,
      readOnly,
      onStopBrowser,
    ]);

    // Determine test status
    const getTestStatus = () => {
      if (isTestRunning || isLoading) {
        return {
          label: "Running",
          variant: "success" as const,
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
          variant: "info" as const,
        };
      }
      return {
        label: "Ready",
        variant: "outline" as const,
      };
    };

    const testStatus = getTestStatus();

    return (
      <div className="flex flex-1 min-h-0 max-w-full flex-col">
        {/* Test Title Input - Only shown when creating new test */}
        {showTitleInput && onTitleChange && (
          <div className="mb-4 max-w-full shrink-0 space-y-1.5">
            <Label
              htmlFor="test-title"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Test Title
            </Label>
            <Input
              id="test-title"
              value={testTitle || ""}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter a descriptive name for your test..."
              disabled={isTestRunning || isBrowserLoading}
            />
          </div>
        )}

        {/* Test Instructions Input - Fixed at top */}
        <div className="mb-4 max-w-full shrink-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="test-instructions"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Test Instructions
            </Label>
            <Badge variant={testStatus.variant} className="text-[10px]">
              {testStatus.label}
            </Badge>
          </div>
          <Textarea
            id="test-instructions"
            value={testInstructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="Enter test instructions for the browser agent..."
            disabled={isTestRunning || isBrowserLoading || readOnly}
            readOnly={readOnly}
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Messages Area - Scrollable, grows to fill space */}
        <div
          ref={scrollAreaRef}
          className="min-h-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden "
        >
          <div className="max-w-full space-y-5">
            {messages.length === 0 && !isTestRunning && (
              <div className="max-w-full overflow-hidden text-sm text-muted-foreground">
                <p>
                  Enter test instructions above and click &quot;Run Test&quot;
                  to begin
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
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
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                        <User className="h-3 w-3 text-background" />
                      </div>
                      <span className="font-medium">You</span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="font-medium">Agent</span>
                    </>
                  )}
                </div>

                {/* Message Parts - render in order */}
                <div className="max-w-full space-y-2 text-sm">
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
                          className="my-2 max-w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-3"
                        >
                          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            Thinking
                          </div>
                          <div className="prose prose-xs max-w-full text-muted-foreground dark:prose-invert">
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
                            <div className="w-full max-w-full overflow-hidden rounded-lg border border-border/60 bg-background">
                              <CollapsibleTrigger className="flex w-full max-w-full items-center justify-between gap-2 overflow-hidden p-2.5 text-left text-xs font-medium transition-colors hover:bg-muted/40">
                                <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5 overflow-hidden">
                                  <ToolIcon
                                    className={`h-3.5 w-3.5 shrink-0 ${toolConfig.color}`}
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
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  )}
                                  {hasError && (
                                    <X className="h-3 w-3 text-destructive" />
                                  )}
                                  <ChevronDown className="h-3 w-3 transition-transform ui-expanded:rotate-180" />
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent className="w-full max-w-full overflow-hidden border-t border-border/60">
                                <div className="max-h-60 w-full max-w-full overflow-y-auto overflow-x-hidden">
                                  <div className="w-full max-w-full overflow-hidden p-2.5">
                                    {/* Render tool-specific content */}
                                    {toolName === "stagehandGoto" && (
                                      <>
                                        {hasUrl(toolPart.input) && (
                                          <div className="mb-2 max-w-full overflow-hidden">
                                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                              URL
                                            </div>
                                            <div className="max-w-full overflow-hidden text-xs text-blue-600 break-all">
                                              {toolPart.input.url}
                                            </div>
                                          </div>
                                        )}
                                        {isToolOutput(toolPart.output) && (
                                          <div className="mb-2 max-w-full overflow-hidden">
                                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                              Result
                                            </div>
                                            <div className="max-w-full overflow-hidden text-xs text-emerald-600 break-all">
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
                                          <div className="mb-2 max-w-full overflow-hidden">
                                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                              Details
                                            </div>
                                            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground font-mono">
                                              {JSON.stringify(
                                                toolPart.input,
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        )}

                                        {toolPart.output !== undefined && (
                                          <div className="mb-2 max-w-full overflow-hidden">
                                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                              Result
                                            </div>
                                            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground font-mono">
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
                                      <div className="max-w-full overflow-hidden rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                                        <div className="font-medium">Error</div>
                                        <div className="mt-1 max-w-full overflow-hidden break-all">
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-3 w-3" />
                </div>
                <span className="font-medium">Agent</span>
                <div className="ml-2 flex gap-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:200ms]" />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:400ms]" />
                </div>
              </div>
            )}

            {error && (
              <div className="max-w-full overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <div className="font-medium">Error</div>
                <div className="mt-1 text-xs break-all">{error.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Run/Stop Test Button - Fixed at bottom right */}
        {!hideRunButton && (
          <div className="mt-4 flex max-w-full shrink-0 justify-end">
            {isTestRunning || browserInstance ? (
              <Button
                onClick={handleStopTest}
                disabled={isBrowserLoading}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop Test
              </Button>
            ) : (
              <Button
                onClick={handleRunTest}
                disabled={!testInstructions.trim() || isBrowserLoading}
                size="lg"
                className="gap-2"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Run Test
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

ChatView.displayName = "ChatView";

export default ChatView;
