import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { loadRootEnv } from "../../scripts/load-root-env.mjs";

// Load the monorepo-root .env files so NEXT_PUBLIC_* vars are inlined at build
// time. `next dev` runs from this app dir and won't read the root .env itself.
loadRootEnv(path.join(__dirname, "../../"));

const nextConfig: NextConfig = {
  // Must point to the monorepo root so Next.js file tracing follows imports
  // up through pnpm's node_modules/.pnpm/ tree and includes the Prisma native
  // engine binary (libquery_engine-rhel-openssl-3.0.x.so.node) in the bundle.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/libquery_engine*",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/libquery_engine*",
      "../../packages/db/node_modules/.prisma/client/libquery_engine*",
    ],
  },
  // Server source maps are uploaded to Sentry at build time and then left on
  // disk: @sentry/nextjs deletes the client ones only, deliberately, because
  // deleting the server ones broke Vercel builds (getsentry/sentry-javascript
  // #13099). Next.js then traces the .js.map sitting next to a chunk into
  // every function that uses that chunk.
  //
  // In .next/server they are 51 MB of 73 MB, and a route drags in most of the
  // shared chunks, so the same maps are copied into each function - two thirds
  // of what a deployment stores as function code, kept forever alongside every
  // deployment Vercel retains. Nothing reads them there: Sentry symbolicates
  // from the copy it already holds, matched by debug id, not from the file.
  outputFileTracingExcludes: {
    "/*": ["**/*.js.map", "**/*.mjs.map", "**/*.cjs.map"],
  },
  // @react-pdf/renderer uses native canvas - must not be bundled by webpack
  serverExternalPackages: ["@react-pdf/renderer", "canvas"],
  // Validate env at build time (fail fast if required vars are missing)
  // Full env schema is in lib/env.ts
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    // Allowlist external image domains (SSRF protection - no user-controlled URLs)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Signed URLs for private buckets (e.g. uploaded avatars). Time-limited
        // tokens; access is still gated by service_role-issued signatures.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // Transpile internal workspace packages
  transpilePackages: [
    "@cyberlearn/db",
    "@cyberlearn/email",
    "@cyberlearn/lib",
    "@cyberlearn/types",
    "@cyberlearn/ui",
  ],
  redirects() {
    // Pages moved off their French slugs (route directories are code and
    // follow the English-only rule); keep the old URLs alive for links
    // already shared in emails, store listings and bookmarks.
    return Promise.resolve([
      { source: "/telecharger", destination: "/download", permanent: true },
      { source: "/classement", destination: "/leaderboard", permanent: true },
      { source: "/defis", destination: "/challenges", permanent: true },
      { source: "/casier", destination: "/locker", permanent: true },
      { source: "/certifs", destination: "/certificates", permanent: true },
      { source: "/legal/cgu", destination: "/legal/terms", permanent: true },
      { source: "/ma-classe", destination: "/my-class", permanent: true },
    ]);
  },
  rewrites() {
    // Mobile builds already installed still call the old endpoint name;
    // serve the renamed handler transparently (no redirect round-trip).
    return Promise.resolve([
      { source: "/api/mobile/classement", destination: "/api/mobile/leaderboard" },
    ]);
  },
  headers() {
    // Defense-in-depth: stricter CSP on static script paths under our
    // control (workers and runtimes). These paths serve trusted code
    // that has no need for cross-origin requests or arbitrary script
    // injection. Already neutralized inside workers at the JS level;
    // this is a browser-enforced additional layer.
    const workerCsp = [
      // 'unsafe-eval' required by JSCPP (uses eval() for C parsing/interpretation)
      // 'wasm-unsafe-eval' required by Pyodide (WebAssembly.instantiateStreaming)
      // Cohérent avec la CSP du main thread qui contient déjà ces directives.
      // Defense-in-depth maintenue par script-src 'self' (no external scripts)
      // + connect-src 'self' (no external fetches) + object-src 'none' + base-uri 'none'.
      "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'",
      "connect-src 'self'", // Pyodide fetches pyodide.asm.wasm from /runtimes/
      "object-src 'none'",
      "base-uri 'none'",
    ].join("; ");

    return Promise.resolve([
      {
        source: "/workers/:path*",
        headers: [{ key: "Content-Security-Policy", value: workerCsp }],
      },
      {
        source: "/runtimes/:path*",
        headers: [{ key: "Content-Security-Policy", value: workerCsp }],
      },
    ]);
  },
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
