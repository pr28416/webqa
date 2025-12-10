"use client";

import { useEffect, useState } from "react";
import { StopCircle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserInstance } from "@/types/browser";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-4">
        {/* Session Info Icon with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label="Session information"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto" align="start">
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Session ID
              </div>
              <div className="font-mono text-xs">{browserInstance.id}</div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Session Timer */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
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
        className="h-7 gap-1.5 text-xs"
      >
        <StopCircle className="h-3.5 w-3.5" />
        Stop
      </Button>
    </div>
  );
}
