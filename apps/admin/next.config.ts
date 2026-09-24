import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { loadRootEnv } from "../../scripts/load-root-env.mjs";

// Load the monorepo-root .env files so NEXT_PUBLIC_* vars are inlined at build
// time. `next dev` runs from this app dir and won't read the root .env itself.
loadRootEnv(path.join(__dirname, "../../"));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The multi-file lesson import sends batches up to 4 MB (zod-capped in
      // the action); the Next.js default of 1 MB would fail at the transport
      // layer with an opaque error before validation runs.
      bodySizeLimit: "8mb",
    },
  },
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/libquery_engine*",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/libquery_engine*",
      "../../packages/db/node_modules/.prisma/client/libquery_engine*",
    ],
    // "Mettre à jour depuis le dépôt" reads the lesson files at run time. They
    // ship with that route only, not with every function of the console.
    "/lessons/sync": ["../../content/lessons/**/*.mdx"],
  },
  // Same as apps/web: Sentry uploads the server source maps and then leaves
  // them on disk - it deletes the client ones only, deliberately - and Next.js
  // traces the .js.map next to a chunk into every function using that chunk.
  // Nothing reads them there; Sentry symbolicates from its own copy by debug
  // id. See the longer note in apps/web/next.config.ts.
  outputFileTracingExcludes: {
    "/*": ["**/*.js.map", "**/*.mjs.map", "**/*.cjs.map"],
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
  // Keep browser telemetry same-origin so privacy filters and Cloudflare's
  // ingest cookies cannot block or pollute client-side error reporting.
  tunnelRoute: "/monitoring",
  // Don't auto-create Vercel Cron monitors (we manage cron separately)
  automaticVercelMonitors: false,
});
