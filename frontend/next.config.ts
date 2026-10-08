import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The production Dockerfile sets this to get a self-contained server in .next/standalone.
  // Left off elsewhere because `next start` (used by Playwright) doesn't support standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
