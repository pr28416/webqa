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

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Chat View - Left Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full max-w-full flex-col overflow-hidden bg-background p-6">
            <ChatView browserInstance={browserInstance} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Browser View - Right Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-background">
            <BrowserView
              browserInstance={browserInstance}
              onBrowserInstanceChange={setBrowserInstance}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
