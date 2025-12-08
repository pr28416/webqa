"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserInstance } from "@/types/browser";
import BrowserNavBar from "./BrowserNavBar";

export default function BrowserView() {
  const [browserInstance, setBrowserInstance] =
    useState<BrowserInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Creates a new browser instance by calling the POST /api/browser endpoint
   */
  async function handleStartBrowser() {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

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

      setBrowserInstance(null);
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
          isLoading={isLoading}
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
          // Show play button when not running
          <Button
            onClick={handleStartBrowser}
            disabled={isLoading}
            size="lg"
            className="h-24 w-24 rounded-full p-0"
            variant="default"
          >
            <Play className="h-12 w-12" fill="currentColor" />
          </Button>
        )}
      </div>
    </div>
  );
}

