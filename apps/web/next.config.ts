import path from "path";
import type { NextConfig } from "next";

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

export default nextConfig;
