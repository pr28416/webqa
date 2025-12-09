import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize packages that have issues with Turbopack bundling
  // This prevents Next.js from trying to bundle test files and Node.js-specific modules
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "@browserbasehq/stagehand",
    "playwright",
    "playwright-core",
  ],
};

export default nextConfig;
