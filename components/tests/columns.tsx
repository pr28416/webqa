"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Interaction } from "@/types/test-execution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const columns: ColumnDef<Interaction>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 text-xs font-medium"
        >
          Title
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const title = row.getValue("title") as string | null;
      return (
        <div className="max-w-xs truncate font-medium text-foreground">
          {title || (
            <span className="font-normal text-muted-foreground">Untitled Test</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "userPrompt",
    header: "Instructions",
    cell: ({ row }) => {
      const prompt = row.getValue("userPrompt") as string;
      const summary = row.original.assistantSummary;
      return (
        <div className="max-w-md">
          <div className="truncate text-sm text-muted-foreground">{prompt}</div>
          {summary && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground/70">
              {summary}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 text-xs font-medium"
        >
          Status
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as Interaction["status"];

      switch (status) {
        case "running":
          return (
            <Badge variant="info" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </Badge>
          );
        case "passed":
          return (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Passed
            </Badge>
          );
        case "failed":
          return (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Failed
            </Badge>
          );
        case "error":
          return (
            <Badge variant="warning" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          );
        case "canceled":
          return (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3" />
              Canceled
            </Badge>
          );
      }
    },
    filterFn: (row, id, value) => {
      return value === "" || row.getValue(id) === value;
    },
  },
  {
    accessorKey: "startedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 text-xs font-medium"
        >
          Started
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as Date | null;
      if (!date) return <span className="text-muted-foreground">—</span>;
      try {
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        );
      } catch {
        return <span className="text-muted-foreground">—</span>;
      }
    },
  },
  {
    id: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const startedAt = row.original.startedAt;
      const finishedAt = row.original.finishedAt;

      if (!startedAt || !finishedAt) return <span className="text-muted-foreground">—</span>;

      const duration = Math.round(
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
      );

      return <span className="text-sm text-muted-foreground tabular-nums">{duration}s</span>;
    },
  },
];
