import type { MetadataRoute } from "next";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/protected-routes";
import { SITE_URL } from "./site-url";

/**
 * The site had no robots.txt at all, and the middleware answered /robots.txt
 * with the login page, so crawlers received HTML where they expected rules.
 *
 * Everything behind authentication is disallowed: those URLs redirect to /login
 * for a crawler, which produces a pile of near-duplicate login pages in the
 * index and dilutes the pages that matter. The middleware's own list is read,
 * so a protected route added there is disallowed here too.
 *
 * The rest are not pages a crawler has any business on either: /account and
 * /auth are account flows, /api answers JSON. /settings and /changelog are no
 * pages any more but windows over the dashboard, which their addresses
 * redirect to (next.config.ts). They stay listed: a crawler has no reason to
 * follow them there.
 */
const PRIVATE = [
  ...PROTECTED_ROUTE_PREFIXES,
  "/settings",
  "/changelog",
  "/account",
  "/auth",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  // SITE_URL is the canonical apex origin, so both directives match the final
  // URL served in production instead of pointing crawlers through www.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE.map((p) => `${p}/`).concat(PRIVATE),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
