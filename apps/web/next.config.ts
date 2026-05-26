import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
  // @react-pdf/renderer uses native canvas — must not be bundled by webpack
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
    // Allowlist external image domains (SSRF protection — no user-controlled URLs)
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
  // Transpile internal workspace packages
  transpilePackages: [
    "@cyberlearn/db",
    "@cyberlearn/email",
    "@cyberlearn/lib",
    "@cyberlearn/types",
    "@cyberlearn/ui",
  ],
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
  // Spread optional vars only when defined — exactOptionalPropertyTypes rejects `string | undefined`
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
