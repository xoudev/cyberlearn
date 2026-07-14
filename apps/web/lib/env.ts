import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Server + client environment variable validation.
 * Validated at build time and startup; the app refuses to start with missing/invalid vars.
 *
 * Add variables here as they're needed across phases.
 * All variables must also be documented in /.env.example.
 */
export const env = createEnv({
  emptyStringAsUndefined: true,
  server: {
    // Database (Supabase Postgres via Prisma)
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),

    // Supabase service role: SERVER ONLY, never exposed to client
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Transactional email (Resend)
    RESEND_API_KEY: z.string().startsWith("re_"),
    RESEND_FROM_EMAIL: z.string().email(),

    // Jira integration (contact form → tickets): optional until Phase implemented
    JIRA_BASE_URL: z.string().url().optional(),
    JIRA_API_EMAIL: z.string().email().optional(),
    JIRA_API_TOKEN: z.string().min(1).optional(),
    JIRA_PROJECT_KEY: z.string().min(1).optional(),

    // Rate limiting (Upstash Redis): optional, degrades gracefully without Redis
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // Cloudflare Turnstile captcha: optional until Phase implemented
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

    // IP address pseudonymization salt (GDPR: SHA-256 hashing)
    IP_SALT: z.string().min(32),

    // Supabase Auth Hook secret: verifies hook requests come from Supabase
    SUPABASE_HOOK_SECRET: z.string().min(16),

    // Monitoring (Sentry): all optional, no-op when absent
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),

    // Cron job security token (validated in /api/cron/* handlers)
    CRON_SECRET: z.string().min(32).optional(),
  },

  client: {
    // Supabase public credentials (safe to expose)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // Site URLs
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_ADMIN_URL: z.string().url(),

    // Mobile distribution links (the page stays usable while a channel is unavailable)
    NEXT_PUBLIC_ANDROID_PLAY_URL: z.string().url().optional(),
    NEXT_PUBLIC_ANDROID_APK_URL: z.string().url().optional(),
    NEXT_PUBLIC_IOS_APP_STORE_URL: z.string().url().optional(),

    // Cloudflare Turnstile site key: optional until Phase implemented
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),

    // Sentry public DSN (safe to expose; used in browser + server configs)
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

    // CSP reporting endpoint (Sentry tunnel for violations)
    NEXT_PUBLIC_SENTRY_CSP_REPORT_URI: z.string().url().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    JIRA_BASE_URL: process.env.JIRA_BASE_URL,
    JIRA_API_EMAIL: process.env.JIRA_API_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    IP_SALT: process.env.IP_SALT,
    SUPABASE_HOOK_SECRET: process.env.SUPABASE_HOOK_SECRET,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_ANDROID_PLAY_URL: process.env.NEXT_PUBLIC_ANDROID_PLAY_URL,
    NEXT_PUBLIC_ANDROID_APK_URL: process.env.NEXT_PUBLIC_ANDROID_APK_URL,
    NEXT_PUBLIC_IOS_APP_STORE_URL: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_CSP_REPORT_URI: process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI,
  },

  // Skip validation in CI environments that don't set all vars
  // (e.g., during lint/typecheck steps that don't need runtime env)
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint" ||
    process.env.npm_lifecycle_event === "lint:fix",
});
