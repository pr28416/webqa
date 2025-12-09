"use client";

import { useState } from "react";
import { BrowserInstance } from "@/types/browser";
import BrowserNavBar from "./BrowserNavBar";

interface BrowserViewProps {
  browserInstance: BrowserInstance | null;
  onBrowserInstanceChange: (instance: BrowserInstance | null) => void;
  isLoading?: boolean;
}

export default function BrowserView({
  browserInstance,
  onBrowserInstanceChange,
  isLoading: externalIsLoading,
}: BrowserViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Use external loading state if provided, otherwise use internal state
  const loading = externalIsLoading ?? isLoading;

  /**
   * Stops the current browser instance by calling DELETE /api/browser
   */
  async function handleStopBrowser() {
    if (!browserInstance) return;

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
      <div className="relative flex flex-1 items-center justify-center">
        {browserInstance ? (
          // Show browser live view when running
          <iframe
            src={browserInstance.browser_live_view_url}
            className="h-full w-full"
            title="Browser Live View"
          />
        ) : (
          // Show empty state when not running
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No active browser session</p>
            <p className="mt-1 text-xs opacity-70">
              Click &quot;Run Test&quot; on the left to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
