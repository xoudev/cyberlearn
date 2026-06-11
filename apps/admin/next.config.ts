import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { loadRootEnv } from "../../scripts/load-root-env.mjs";

// Load the monorepo-root .env files so NEXT_PUBLIC_* vars are inlined at build
// time. `next dev` runs from this app dir and won't read the root .env itself.
loadRootEnv(path.join(__dirname, "../../"));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/libquery_engine*",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/libquery_engine*",
      "../../packages/db/node_modules/.prisma/client/libquery_engine*",
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  transpilePackages: [
    "@cyberlearn/db",
    "@cyberlearn/email",
    "@cyberlearn/lib",
    "@cyberlearn/types",
    "@cyberlearn/ui",
  ],
  webpack: (config) => {
    // CRITICAL: required for workspace packages using NodeNext .js
    // imports (e.g. @cyberlearn/db imports './prisma.js' which
    // resolves to .ts source). Removing this breaks the build on
    // fresh checkouts. See PR C.3 / docs/hardening/known-issues.md.
    // SAFETY: Next.js types webpack config as `any`; cast to minimal
    // typed interface to satisfy no-unsafe-member-access / dot-notation.
    interface Cfg {
      resolve: { extensionAlias?: Record<string, string[]> };
    }
    const cfg = config as unknown as Cfg;
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js", ".jsx"] };
    return cfg;
  },
};

export default withSentryConfig(nextConfig, {
  // Spread optional vars only when defined - exactOptionalPropertyTypes rejects `string | undefined`
  ...(process.env.SENTRY_ORG && { org: process.env.SENTRY_ORG }),
  ...(process.env.SENTRY_PROJECT && { project: process.env.SENTRY_PROJECT }),
  ...(process.env.SENTRY_AUTH_TOKEN && { authToken: process.env.SENTRY_AUTH_TOKEN }),
  // Suppress plugin output in non-CI builds (avoids noise in local dev)
  silent: !process.env.CI,
  // Upload wider set of files to improve stack trace symbolication
  widenClientFileUpload: true,
  // Delete source maps from the server bundle after upload (not served publicly)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Remove Sentry logger statements from the production bundle
  disableLogger: true,
  // Don't auto-create Vercel Cron monitors (we manage cron separately)
  automaticVercelMonitors: false,
});
