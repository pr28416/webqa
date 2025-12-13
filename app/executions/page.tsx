"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Interaction } from "@/types/test-execution";
import { ExecutionsResponse } from "@/types/api";
import { AlertCircle, History, X } from "lucide-react";
import { DataTable } from "@/components/tests/data-table";
import { columns } from "@/components/tests/columns";
import { EmptyState } from "@/components/tests/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function ExecutionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testIdFilter = searchParams.get("testId");

  const [executions, setExecutions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExecutions() {
      try {
        // Fetch more executions for client-side pagination
        let url = "/api/executions?limit=500&offset=0";
        if (testIdFilter) {
          url += `&testId=${testIdFilter}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch executions: ${response.statusText}`);
        }

        const data: ExecutionsResponse = await response.json();
        setExecutions(data.interactions);
      } catch (err) {
        console.error("Error fetching executions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load executions"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchExecutions();
  }, [testIdFilter]);

  if (error) {
    return (
      <SidebarInset>
        <div className="flex h-screen items-center justify-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Error Loading Executions
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-6"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      {/* Header with SidebarTrigger */}
      <header className="flex h-16 shrink-0 items-center gap-2 px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/executions"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  WebQA
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Page Header */}
      <div className="flex items-start justify-between px-6 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Execution History
          </h1>
          {testIdFilter && (
            <Badge variant="secondary" className="gap-1">
              Filtered by test
              <button
                onClick={() => router.push("/executions")}
                className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                aria-label="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-9 flex-1 max-w-xs" />
              <Skeleton className="h-9 w-[140px]" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ) : executions.length === 0 ? (
          <EmptyState
            icon={History}
            title={
              testIdFilter
                ? "No executions for this test"
                : "No test executions yet"
            }
            description={
              testIdFilter
                ? "This test hasn't been executed yet. Run it to see results here."
                : "Test execution history will appear here once you run your tests."
            }
            actionLabel={testIdFilter ? "Clear Filter" : "Go to Tests"}
            onAction={() =>
              router.push(testIdFilter ? "/executions" : "/tests")
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={executions}
            searchColumn="title"
            filterColumn="status"
            filterOptions={[
              { label: "All statuses", value: "all" },
              { label: "Running", value: "running" },
              { label: "Passed", value: "passed" },
              { label: "Failed", value: "failed" },
              { label: "Error", value: "error" },
              { label: "Canceled", value: "canceled" },
            ]}
            onRowClick={(execution) =>
              router.push(`/executions/${execution.interactionId}`)
            }
          />
        )}
      </div>
    </SidebarInset>
  );
}
