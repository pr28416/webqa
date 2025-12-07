"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowserInstance } from "@/types/browser";

/**
 * BrowserManager Component
 * Provides UI for managing a single browser instance via Kernel API
 * Allows creating, loading, and deleting browser instances
 */
export default function BrowserManager() {
  // State for the currently loaded browser instance
  const [instance, setInstance] = useState<BrowserInstance | null>(null);
  // State for the browser ID input field
  const [browserId, setBrowserId] = useState<string>("");

  /**
   * Fetches a browser instance by ID from the API
   * @param id - The browser instance ID to fetch
   */
  const fetchInstance = (id: string) => {
    // Clear instance if no ID provided
    if (!id) {
      setInstance(null);
      return;
    }
    // Fetch browser instance from API
    fetch(`/api/browser?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        // Handle error response by clearing instance
        if (data.error) {
          setInstance(null);
        } else {
          // Set the fetched instance
          setInstance(data);
        }
      });
  };

  /**
   * Handles creating a new browser instance
   * Creates a new browser and automatically loads it
   */
  const handleStart = async () => {
    // Create new browser instance via API
    const response = await fetch("/api/browser", { method: "POST" });
    const newInstance = await response.json();
    // Update state with new browser instance
    setBrowserId(newInstance.id);
    setInstance(newInstance);
  };

  /**
   * Handles deleting the current browser instance
   * Deletes the browser and clears the UI state
   */
  const handleDelete = async () => {
    // Early return if no browser ID
    if (!browserId) return;
    // Delete browser instance via API
    await fetch(`/api/browser?id=${browserId}`, { method: "DELETE" });
    // Clear UI state after deletion
    setInstance(null);
    setBrowserId("");
  };

  /**
   * Handles loading a browser instance by ID from input field
   */
  const handleLoad = () => {
    fetchInstance(browserId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4 space-y-2">
        {/* Browser ID input and load button */}
        <div className="flex gap-2">
          <Input
            placeholder="Browser ID"
            value={browserId}
            onChange={(e) => setBrowserId(e.target.value)}
          />
          <Button onClick={handleLoad}>Load</Button>
        </div>
        {/* Button to create a new browser instance */}
        <Button onClick={handleStart}>Start Browser Instance</Button>
      </div>
      {/* Display browser instance details if one is loaded */}
      {instance && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>{instance.id}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Display CDP WebSocket URL */}
              <p className="text-sm mb-2">{instance.cdp_ws_url}</p>
              {/* Button to delete the current browser instance */}
              <Button onClick={handleDelete} variant="destructive" size="sm">
                Delete
              </Button>
            </CardContent>
          </Card>
          {/* Live view iframe */}
          {instance.browser_live_view_url && (
            <Card>
              <CardHeader>
                <CardTitle>Live View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full border rounded-lg overflow-hidden">
                  <iframe
                    src={instance.browser_live_view_url}
                    className="w-full h-[600px] border-0"
                    title="Browser Live View"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
