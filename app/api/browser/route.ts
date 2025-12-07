import { NextRequest, NextResponse } from "next/server";
import Kernel from "@onkernel/sdk";
import { BrowserInstance } from "@/types/browser";

// Initialize the Kernel SDK client with API key from environment variables
const kernel = new Kernel({ apiKey: process.env.ONKERNEL_API_KEY! });

/**
 * GET /api/browser
 * Retrieves a browser instance by ID from the Kernel API
 * @param request - Next.js request object containing query parameters
 * @returns Browser instance data or error response
 */
export async function GET(request: NextRequest) {
  // Extract browser ID from query parameters
  const id = request.nextUrl.searchParams.get("id");
  // Validate that ID is provided
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // Retrieve browser instance from Kernel API
  const kernelBrowser = await kernel.browsers.retrieve(id);
  // Transform Kernel browser response to our BrowserInstance type
  const instance: BrowserInstance = {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
  return NextResponse.json(instance);
}

/**
 * POST /api/browser
 * Creates a new browser instance via the Kernel API
 * @returns Newly created browser instance data
 */
export async function POST() {
  // Create a new browser instance using Kernel API
  const kernelBrowser = await kernel.browsers.create();
  // Transform Kernel browser response to our BrowserInstance type
  const instance: BrowserInstance = {
    id: kernelBrowser.session_id,
    cdp_ws_url: kernelBrowser.cdp_ws_url,
    browser_live_view_url: kernelBrowser.browser_live_view_url || "",
  };
  return NextResponse.json(instance);
}

/**
 * DELETE /api/browser
 * Deletes a browser instance by ID via the Kernel API
 * @param request - Next.js request object containing query parameters
 * @returns Empty response or error response
 */
export async function DELETE(request: NextRequest) {
  // Extract browser ID from query parameters
  const id = request.nextUrl.searchParams.get("id");
  // Validate that ID is provided
  if (!id) {
    return NextResponse.json(
      { error: "Browser ID is required" },
      { status: 400 }
    );
  }
  // Delete browser instance from Kernel API
  await kernel.browsers.deleteByID(id);
  return NextResponse.json({});
}
