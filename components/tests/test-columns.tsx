"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Test } from "@/types/test";
import { Button } from "@/components/ui/button";
import {
  Eye,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const testColumns: ColumnDef<Test>[] = [
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
      const title = row.getValue("title") as string;
      return <div className="max-w-xs truncate font-medium text-foreground">{title}</div>;
    },
  },
  {
    accessorKey: "instructions",
    header: "Instructions",
    cell: ({ row }) => {
      const instructions = row.getValue("instructions") as string;
      return <div className="max-w-md truncate text-sm text-muted-foreground">{instructions}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 text-xs font-medium"
        >
          Created
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | null;
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
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 text-xs font-medium"
        >
          Updated
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date | null;
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
    id: "actions",
    header: () => <div className="text-right text-xs font-medium">Actions</div>,
    cell: ({ row }) => {
        const TestActionCell = () => {
        const router = useRouter();
        return (
          <div className="flex justify-end gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/executions?testId=${row.original.testId}`);
                  }}
                >
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Executions
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/tests/${row.original.testId}`);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement delete test
                    console.log("Delete test:", row.original.testId);
                  }}
                >
                  <Trash className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      };
      return <TestActionCell />;
    },
  },
];
