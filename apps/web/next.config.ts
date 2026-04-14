import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    "@cyberlearn/ui",
    "@cyberlearn/lib",
    "@cyberlearn/types",
    "@cyberlearn/email",
  ],
};

export default nextConfig;
