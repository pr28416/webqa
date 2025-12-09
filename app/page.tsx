"use client";

import { useState } from "react";
import ChatView from "@/components/chat/ChatView";
import BrowserView from "@/components/browser/BrowserView";
import { BrowserInstance } from "@/types/browser";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function Home() {
  const [browserInstance, setBrowserInstance] =
    useState<BrowserInstance | null>(null);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);

  /**
   * Creates a new browser instance by calling the POST /api/browser endpoint
   */
  async function handleStartBrowser() {
    setIsBrowserLoading(true);
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

  /**
   * Stops the current browser instance by calling DELETE /api/browser
   */
  async function handleStopBrowser() {
    if (!browserInstance) return;

    setIsBrowserLoading(true);
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
      setIsBrowserLoading(false);
    }
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Chat View - Left Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full max-w-full flex-col overflow-hidden bg-background p-6">
            <ChatView
              browserInstance={browserInstance}
              onStartBrowser={handleStartBrowser}
              onStopBrowser={handleStopBrowser}
              isBrowserLoading={isBrowserLoading}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Browser View - Right Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-background">
            <BrowserView
              browserInstance={browserInstance}
              onBrowserInstanceChange={setBrowserInstance}
              isLoading={isBrowserLoading}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
