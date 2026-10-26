import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOWED } from "@/lib/routes";
import { SITE_URL } from "./site-url";

/**
 * The site had no robots.txt at all, and the middleware answered /robots.txt
 * with the login page, so crawlers received HTML where they expected rules.
 *
 * Everything behind authentication is disallowed: those URLs redirect to /login
 * for a crawler, which produces a pile of near-duplicate login pages in the
 * index and dilutes the pages that matter. So are the addresses that are no
 * page (windows and tabs their old address redirects to, account flows, the
 * API). Both come from the route registry (lib/routes.ts), the list the
 * middleware reads too, so a protected route added there is disallowed here.
 */
export default function robots(): MetadataRoute.Robots {
  // SITE_URL is the canonical apex origin, so both directives match the final
  // URL served in production instead of pointing crawlers through www.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOWED],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
