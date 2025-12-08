import ChatView from "@/components/chat/ChatView";
import BrowserView from "@/components/browser/BrowserView";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function Home() {
  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Chat View - Left Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-background p-6">
            <ChatView />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Browser View - Right Side */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-background">
            <BrowserView />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
