"use client";

import { useEffect, useState } from "react";
import { StopCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserInstance } from "@/types/browser";

interface BrowserNavBarProps {
  browserInstance: BrowserInstance;
  onStop: () => void;
  isLoading: boolean;
}

/**
 * Formats elapsed seconds into mm:ss or hh:mm:ss format
 */
function formatSessionTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export default function BrowserNavBar({
  browserInstance,
  onStop,
  isLoading,
}: BrowserNavBarProps) {
  const [sessionTime, setSessionTime] = useState(0);

  // Session timer - increments every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
      <div className="flex items-center gap-4">
        {/* Session ID */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Session:</span>
          <span className="font-mono text-sm text-muted-foreground">
            {browserInstance.id}
          </span>
        </div>

        {/* Session Timer */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground">
            {formatSessionTime(sessionTime)}
          </span>
        </div>
      </div>

      {/* Stop Button */}
      <Button
        onClick={onStop}
        disabled={isLoading}
        variant="destructive"
        size="sm"
        className="gap-2"
      >
        <StopCircle className="h-4 w-4" />
        Stop
      </Button>
    </div>
  );
}
