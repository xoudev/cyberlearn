import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Vercel injects its Live toolbar (feedback + comments) into preview
// deployments; it loads scripts, an iframe and websockets from vercel.live.
// Allow those sources on previews only - production keeps the strict policy.
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = {
  script: isVercelPreview ? " https://vercel.live" : "",
  style: isVercelPreview ? " https://vercel.live" : "",
  img: isVercelPreview ? " https://vercel.live https://vercel.com" : "",
  font: isVercelPreview ? " https://vercel.live https://assets.vercel.com" : "",
  connect: isVercelPreview ? " https://vercel.live wss://*.pusher.com" : "",
};

// Monaco editor requires unsafe-eval in all environments (not just dev)
// because it compiles TypeScript/JavaScript at runtime.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.script}`,
    `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.style}`,
    `img-src 'self' data: https://*.supabase.co https://avatars.githubusercontent.com${vercelLive.img}`,
    `font-src 'self' data:${vercelLive.font}`,
    isDev
      ? `connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`
      : `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`,
    ...(isVercelPreview ? ["frame-src 'self' https://vercel.live"] : []),
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ...(process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI
      ? [`report-uri ${process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI}`]
      : []),
  ].join("; "),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
};

export function middleware(): NextResponse {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monitoring).*)"],
};
