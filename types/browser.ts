/**
 * BrowserInstance interface
 * Represents a browser instance managed by Kernel
 */
export interface BrowserInstance {
  /** Unique identifier for the browser session */
  id: string;
  /** Chrome DevTools Protocol WebSocket URL for connecting to the browser */
  cdp_ws_url: string;
  /** Live view URL for real-time browser interaction */
  browser_live_view_url: string;
}
