"use client";

import { useState } from "react";
import { BrowserInstance } from "@/types/browser";
import BrowserNavBar from "./BrowserNavBar";
import { Monitor, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrowserViewProps {
  browserInstance: BrowserInstance | null;
  onBrowserInstanceChange: (instance: BrowserInstance | null) => void;
  isLoading?: boolean;
  onRunTest?: () => void;
  onStopAgent?: () => void;
}

export default function BrowserView({
  browserInstance,
  onBrowserInstanceChange,
  isLoading: externalIsLoading,
  onRunTest,
  onStopAgent,
}: BrowserViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Use external loading state if provided, otherwise use internal state
  const loading = externalIsLoading ?? isLoading;

  /**
   * Stops the current browser instance and agent by calling DELETE /api/browser
   * and stopping the agent if onStopAgent is provided
   */
  async function handleStopBrowser() {
    if (!browserInstance) return;

    // Stop the agent first if callback is provided
    // The agent's stop handler will take care of stopping the browser
    if (onStopAgent) {
      onStopAgent();
      return;
    }

    // Only delete browser directly if there's no agent
    setIsLoading(true);
    try {
      const response = await fetch(`/api/browser?id=${browserInstance.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to stop browser: ${response.statusText}`);
      }

      onBrowserInstanceChange(null);
    } catch (error) {
      console.error("Error stopping browser:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to stop browser instance"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* VM-Style Nav Bar - Only shown when browser is running */}
      {browserInstance && (
        <BrowserNavBar
          browserInstance={browserInstance}
          onStop={handleStopBrowser}
          isLoading={loading}
        />
      )}

      {/* Browser Content Area */}
      <div className="relative flex flex-1 items-center justify-center bg-background">
        {browserInstance ? (
          // Show browser live view when running
          <iframe
            src={browserInstance.browser_live_view_url}
            className="h-full w-full"
            title="Browser Live View"
          />
        ) : (
          // Show empty state when not running
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Monitor className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              No active browser session
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {onRunTest
                ? "Click the button below to start testing"
                : "Start a test to view the browser"}
            </p>
            {onRunTest && (
              <Button
                size="sm"
                onClick={onRunTest}
                disabled={loading}
                className="gap-2 mt-4"
              >
                <Play className="h-4 w-4" />
                Run Test
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
