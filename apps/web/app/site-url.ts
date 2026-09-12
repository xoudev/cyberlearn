/**
 * Canonical origin for everything a search engine reads: metadataBase, the
 * canonical link, the sitemap and robots.txt.
 *
 * Deliberately NOT NEXT_PUBLIC_SITE_URL. That variable is set to the apex
 * (https://cyberlearn.fr) and is load-bearing well beyond SEO: Supabase auth
 * redirects (signup confirmation, password reset, mobile OTP), the RGPD
 * deletion confirmation link, the data-export links, and the issuer URL baked
 * into every issued certificate. Repointing it at www would silently break the
 * auth emails unless Supabase's redirect allowlist were updated in the same
 * breath, and would split certificates issued before and after the change
 * across two hosts.
 *
 * Production serves the apex domain and redirects www to it. Keep every
 * canonical, sitemap entry and robots host on that final destination so search
 * engines never have to canonicalise through a redirect.
 *
 * Set NEXT_PUBLIC_CANONICAL_URL if the primary domain ever moves.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_CANONICAL_URL ?? "https://cyberlearn.fr").replace(
  /\/$/,
  "",
);
