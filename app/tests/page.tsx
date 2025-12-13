"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Test } from "@/types/test";
import { TestsResponse } from "@/types/api";
import { Plus, AlertCircle, FileText } from "lucide-react";
import { DataTable } from "@/components/tests/data-table";
import { testColumns } from "@/components/tests/test-columns";
import { EmptyState } from "@/components/tests/empty-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  useEffect(() => {
    async function fetchTests() {
      try {
        // Fetch more tests for client-side pagination
        const response = await fetch("/api/tests?limit=500&offset=0");
        if (!response.ok) {
          throw new Error(`Failed to fetch tests: ${response.statusText}`);
        }

        const data: TestsResponse = await response.json();
        setTests(data.tests);
      } catch (err) {
        console.error("Error fetching tests:", err);
        setError(err instanceof Error ? err.message : "Failed to load tests");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTests();
  }, []);

  async function handleCreateNewTest() {
    setIsCreatingTest(true);
    try {
      // Create a draft test in the database first
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Create with defaults
      });

      if (!response.ok) {
        throw new Error(`Failed to create test: ${response.statusText}`);
      }

      const newTest: Test = await response.json();
      // Navigate to the newly created test
      router.push(`/tests/${newTest.testId}`);
    } catch (err) {
      console.error("Error creating test:", err);
      alert(err instanceof Error ? err.message : "Failed to create test");
      setIsCreatingTest(false);
    }
  }

  if (error) {
    return (
      <SidebarInset>
        <div className="flex h-screen items-center justify-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Error Loading Tests</h2>
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
        <div className="flex items-center gap-2 flex-1">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/tests"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  WebQA
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleCreateNewTest}
            className="gap-2"
            disabled={isCreatingTest}
          >
            <Plus className="h-4 w-4" />
            {isCreatingTest ? "Creating..." : "New test"}
          </Button>
        </div>
      </header>

      {/* Page Header */}
      <div className="flex items-start justify-between px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
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
        ) : tests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests yet"
            description="Get started by creating your first test. Tests are reusable definitions that can be executed multiple times."
            actionLabel={
              isCreatingTest ? "Creating..." : "Create your first test"
            }
            onAction={handleCreateNewTest}
          />
        ) : (
          <DataTable
            columns={testColumns}
            data={tests}
            searchColumn="title"
            onRowClick={(test) => router.push(`/tests/${test.testId}`)}
          />
        )}
      </div>
    </SidebarInset>
  );
}
