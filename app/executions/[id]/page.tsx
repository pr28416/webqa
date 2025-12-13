"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatView from "@/components/chat/ChatView";
import BrowserView from "@/components/browser/BrowserView";
import { BrowserInstance } from "@/types/browser";
import { Interaction, InteractionEvent } from "@/types/test-execution";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
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
import { convertEventsToMessages } from "@/lib/executions/event-to-message";

interface ExecutionDetailResponse {
  interaction: Interaction & { title: string | null };
  events: InteractionEvent[];
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;

  const [interaction, setInteraction] = useState<
    (Interaction & { title: string | null }) | null
  >(null);
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [browserInstance, setBrowserInstance] =
    useState<BrowserInstance | null>(null);

  useEffect(() => {
    async function fetchExecution() {
      try {
        const response = await fetch(`/api/executions/${executionId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Execution not found");
          }
          throw new Error(`Failed to fetch execution: ${response.statusText}`);
        }

        const data: ExecutionDetailResponse = await response.json();
        setInteraction(data.interaction);
        setEvents(data.events);

        // Try to get browser instance from metadata if available
        const metadata = data.interaction.metadata as Record<string, unknown>;
        const browserId = metadata.browserId;
        if (typeof browserId === "string") {
          try {
            const browserResponse = await fetch(`/api/browser?id=${browserId}`);
            if (browserResponse.ok) {
              const browser: BrowserInstance = await browserResponse.json();
              setBrowserInstance(browser);
            }
          } catch {
            // Browser instance may no longer exist, that's okay
          }
        }
      } catch (err) {
        console.error("Error fetching execution:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load execution"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchExecution();
  }, [executionId]);

  function getStatusBadge(status: Interaction["status"]) {
    switch (status) {
      case "running":
        return (
          <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "passed":
        return (
          <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3" />
            Passed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "error":
        return (
          <Badge className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-100">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="gap-1 bg-gray-100 text-gray-800 hover:bg-gray-100">
            <XCircle className="h-3 w-3" />
            Canceled
          </Badge>
        );
    }
  }

  function formatTimestamp(date: Date | null) {
    if (!date) return "—";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "—";
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
            <h2 className="mt-4 text-lg font-semibold">
              Error Loading Execution
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button
                onClick={() => router.push("/executions")}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Executions
              </Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (isLoading || !interaction) {
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

  const duration =
    interaction.finishedAt && interaction.startedAt
      ? Math.round(
          (new Date(interaction.finishedAt).getTime() -
            new Date(interaction.startedAt).getTime()) /
            1000
        )
      : null;

  // Convert events to messages format
  const messages = convertEventsToMessages(events);

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
                  href="/executions"
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
                  href="/executions"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Executions
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
            onClick={() => {
              if (interaction.testId) {
                router.push(`/tests/${interaction.testId}`);
              }
            }}
            disabled={!interaction.testId}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Go to Test
          </Button>
        </div>
      </header>

      {/* Page Header */}
      <div className="flex items-start justify-between px-6 pb-4 min-w-0">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight truncate min-w-0">
              {interaction.title || "Untitled Execution"}
            </h1>
            {getStatusBadge(interaction.status)}
          </div>
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 shrink-0">
            <span>Started {formatTimestamp(interaction.startedAt)}</span>
            {duration !== null && <span>Duration: {duration}s</span>}
            {interaction.finishedAt && (
              <span>Finished {formatTimestamp(interaction.finishedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden h-full">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full border-t"
        >
          {/* Left Panel - Execution History */}
          <ResizablePanel
            defaultSize={40}
            minSize={30}
            maxSize={60}
            className="h-full"
          >
            <div className="flex h-full flex-col border-r border-border/60 bg-background p-4">
              <ChatView
                browserInstance={browserInstance}
                onStartBrowser={async () => {}}
                onStopBrowser={async () => {}}
                isBrowserLoading={false}
                initialInstructions={interaction.userPrompt}
                showTitleInput={false}
                hideRunButton={true}
                readOnly={true}
                initialMessages={messages}
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
                isLoading={false}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarInset>
  );
}
