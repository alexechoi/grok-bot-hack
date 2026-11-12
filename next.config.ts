import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Credentials are provisioned on the running Node host, never copied into builds.
  outputFileTracingExcludes: {
    "/*": ["./.caretakr/**/*", "./.env*", "./**/.env*", "./.git/**/*", "./.concord/**/*"],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
