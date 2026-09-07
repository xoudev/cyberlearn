/**
 * Canonical origin, used by the metadata base, the sitemap and robots.txt.
 * Kept in one place so the three can never disagree about the host, which is
 * exactly the kind of drift that makes a search engine index two versions of
 * the same page.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cyberlearn.fr").replace(
  /\/$/,
  "",
);
