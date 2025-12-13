"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatView, { ChatViewRef } from "@/components/chat/ChatView";
import BrowserView from "@/components/browser/BrowserView";
import { BrowserInstance } from "@/types/browser";
import { Test } from "@/types/test";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertCircle, Eye, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [browserInstance, setBrowserInstance] =
    useState<BrowserInstance | null>(null);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [isDeletingBrowser, setIsDeletingBrowser] = useState(false);

  // Temporary state for unsaved changes
  const [editedTest, setEditedTest] = useState<Partial<Test>>({
    title: "",
    instructions: "",
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Ref to ChatView for triggering runTest
  const chatViewRef = useRef<ChatViewRef>(null);

  useEffect(() => {
    async function fetchTest() {
      try {
        const response = await fetch(`/api/tests/${testId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Test not found");
          }
          throw new Error(`Failed to fetch test: ${response.statusText}`);
        }

        const data: Test = await response.json();
        setTest(data);
        setEditedTest({
          title: data.title,
          instructions: data.instructions,
        });
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err instanceof Error ? err.message : "Failed to load test");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTest();
  }, [testId]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function handleStartBrowser() {
    setIsBrowserLoading(true);
    setIsDeletingBrowser(false); // Reset deletion flag when starting new browser
    try {
      const response = await fetch("/api/browser", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to start browser: ${response.statusText}`);
      }

      const instance: BrowserInstance = await response.json();
      setBrowserInstance(instance);
    } catch (error) {
      console.error("Error starting browser:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start browser instance"
      );
      throw error;
    } finally {
      setIsBrowserLoading(false);
    }
  }

  async function handleStopBrowser() {
    if (!browserInstance) return;

    // Prevent duplicate deletion attempts
    if (isDeletingBrowser) {
      console.log("Browser deletion already in progress, skipping");
      return;
    }

    setIsDeletingBrowser(true);
    setIsBrowserLoading(true);
    try {
      const response = await fetch(`/api/browser?id=${browserInstance.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // If browser is already deleted (404), just clear the state
        if (response.status === 404) {
          console.log("Browser already deleted");
          setBrowserInstance(null);
          return;
        }
        throw new Error(`Failed to stop browser: ${response.statusText}`);
      }

      setBrowserInstance(null);
    } catch (error) {
      console.error("Error stopping browser:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to stop browser instance"
      );
    } finally {
      setIsBrowserLoading(false);
      setIsDeletingBrowser(false);
    }
  }

  function handleInstructionsChange(instructions: string) {
    setEditedTest((prev) => ({ ...prev, instructions }));
    setHasUnsavedChanges(true);
  }

  function handleTitleChange(title: string) {
    setEditedTest((prev) => ({ ...prev, title }));
    setHasUnsavedChanges(true);
  }

  async function handleSaveTitle() {
    if (!editedTest.title?.trim()) {
      if (test) {
        setEditedTest((prev) => ({ ...prev, title: test.title }));
      }
      setIsEditingTitle(false);
      return;
    }

    // Auto-save title changes
    await handleSaveChanges();
    setIsEditingTitle(false);
  }

  async function handleSaveChanges() {
    if (!editedTest.title?.trim()) {
      alert("Test title cannot be empty");
      return;
    }

    if (!editedTest.instructions?.trim()) {
      alert("Test instructions cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      // Update existing test
      const response = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedTest.title,
          instructions: editedTest.instructions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update test: ${response.statusText}`);
      }

      const updatedTest: Test = await response.json();
      setTest(updatedTest);
      setEditedTest({
        title: updatedTest.title,
        instructions: updatedTest.instructions,
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error saving test:", err);
      alert(err instanceof Error ? err.message : "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return (
      <SidebarInset>
        <div className="flex h-screen flex-col items-center justify-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Error Loading Test</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button onClick={() => router.push("/tests")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
              </Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (isLoading) {
    return (
      <SidebarInset>
        <header className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="px-6">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex flex-col h-screen overflow-x-hidden">
      {/* Header with SidebarTrigger */}
      <header className="flex h-16 shrink-0 items-center gap-2 px-6 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="h-4 shrink-0" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/tests"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  WebQA
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/tests"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Tests
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="default"
            onClick={() => router.push(`/executions?testId=${testId}`)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View Executions
          </Button>

          <Button
            size="default"
            onClick={handleSaveChanges}
            disabled={
              !editedTest.title?.trim() ||
              !editedTest.instructions?.trim() ||
              isSaving ||
              isBrowserLoading ||
              !hasUnsavedChanges
            }
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {/* Page Header */}
      <div className="flex items-start justify-between px-6 pb-4 min-w-0">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {isEditingTitle ? (
            <Input
              value={editedTest.title || ""}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveTitle();
                } else if (e.key === "Escape") {
                  if (test) {
                    setEditedTest((prev) => ({ ...prev, title: test.title }));
                  } else {
                    setEditedTest((prev) => ({ ...prev, title: "" }));
                  }
                  setIsEditingTitle(false);
                }
              }}
              className="text-2xl font-semibold tracking-tight h-auto px-2 py-1 wrap-break-word max-w-full"
              autoFocus
              placeholder="Enter test title..."
            />
          ) : (
            <h1
              className="text-2xl font-semibold tracking-tight cursor-pointer hover:text-foreground/80 transition-colors truncate min-w-0"
              onClick={() => setIsEditingTitle(true)}
            >
              {editedTest.title || test?.title || "Untitled Test"}
            </h1>
          )}
          {/* Metadata */}
          {test && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 shrink-0">
              <span>
                Created{" "}
                {formatDistanceToNow(new Date(test.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <span>
                Updated{" "}
                {formatDistanceToNow(new Date(test.updatedAt), {
                  addSuffix: true,
                })}
              </span>
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 font-medium">
                  • Unsaved
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden h-full">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full border-t"
        >
          {/* Left Panel - Test Definition */}
          <ResizablePanel
            defaultSize={40}
            minSize={30}
            maxSize={60}
            className="h-full"
          >
            <div className="flex h-full flex-col border-r border-border/60 bg-background p-4">
              <ChatView
                ref={chatViewRef}
                browserInstance={browserInstance}
                onStartBrowser={handleStartBrowser}
                onStopBrowser={handleStopBrowser}
                isBrowserLoading={isBrowserLoading}
                initialInstructions={editedTest.instructions || ""}
                onInstructionsChange={handleInstructionsChange}
                showTitleInput={false}
                hideRunButton={true}
                testId={testId}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Browser View */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full bg-background">
              <BrowserView
                browserInstance={browserInstance}
                onBrowserInstanceChange={setBrowserInstance}
                isLoading={isBrowserLoading}
                onRunTest={() => chatViewRef.current?.runTest()}
                onStopAgent={() => chatViewRef.current?.stopTest()}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarInset>
  );
}
