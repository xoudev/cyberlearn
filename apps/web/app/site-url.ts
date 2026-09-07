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
 * Meanwhile the apex answers 307 and redirects to www, so www is what visitors
 * and crawlers actually land on. Declaring a canonical that redirects somewhere
 * else leaves the search engine to guess, which is how one page ends up indexed
 * twice. The SEO host and the application host are two different concerns that
 * happened to share one variable; they no longer do.
 *
 * Set NEXT_PUBLIC_CANONICAL_URL if the primary domain ever moves.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_CANONICAL_URL ?? "https://www.cyberlearn.fr"
).replace(/\/$/, "");
