import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

/**
 * The site had no robots.txt at all, and the middleware answered /robots.txt
 * with the login page, so crawlers received HTML where they expected rules.
 *
 * Everything behind authentication is disallowed: those URLs redirect to /login
 * for a crawler, which produces a pile of near-duplicate login pages in the
 * index and dilutes the pages that matter.
 */
const PRIVATE = [
  "/dashboard",
  "/lessons",
  "/paths",
  "/challenges",
  "/review",
  "/revisions",
  "/notes",
  "/badges",
  "/certificates",
  "/leaderboard",
  "/locker",
  "/profile",
  "/settings",
  "/wrapped",
  "/changelog",
  "/onboarding",
  "/account",
  "/auth",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
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
