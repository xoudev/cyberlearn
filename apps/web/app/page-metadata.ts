import type { Metadata } from "next";

/**
 * What every link preview of the site says about who publishes it, and in
 * which language, with the site's emblem as its picture. The root layout
 * declares it, so a page that says nothing of its preview still has it.
 *
 * The picture is here rather than in an app/opengraph-image file: Next drops
 * a parent's image file from any page that declares an `openGraph` of its
 * own, which every public page does, while this object is spread into each
 * of them. Square, like the `summary` card the layout asks for; Next hands
 * it to the Twitter card too.
 *
 * No title, description or address in here. Those belong to each page: Next
 * fills og:title and og:description from the page's own title and
 * description when the preview has none, and a page names its address with
 * pageAddress below.
 */
export const OPEN_GRAPH_SITE = {
  type: "website",
  locale: "fr_FR",
  siteName: "CyberLearn",
  images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "CyberLearn" }],
} satisfies NonNullable<Metadata["openGraph"]>;

/** The words a page may give its preview when they differ from its own. */
interface PreviewText {
  title?: string;
  description?: string;
}

/**
 * A page's own address, for search engines (the canonical link) and for link
 * previews (og:url).
 *
 * Next merges metadata one key deep: a page that declares no `alternates` or
 * no `openGraph` takes its parent's whole object. The root layout used to
 * declare the home page's canonical and preview, so /legal, /privacy and
 * /verify told Google they were duplicates of the home page, and a shared
 * certificate or profile previewed as the home page, under its address.
 *
 * Declaring `openGraph` here replaces the root's, so the site's part is
 * spread back in. `path` is relative: metadataBase makes it absolute.
 */
export function pageAddress(
  path: string,
  preview: PreviewText = {},
): Pick<Metadata, "alternates" | "openGraph"> {
  return {
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_SITE, ...preview, url: path },
  };
}

/**
 * pageAddress for a page that draws its own preview, an opengraph-image file
 * beside it (a public profile's card). The site's emblem is left out: Next
 * fills og:image from the page's file only when the page's own openGraph
 * names no images, so spreading the emblem in would hide the card. The large
 * card is asked for, the picture being a wide one.
 */
export function pageAddressWithOwnImage(
  path: string,
  preview: PreviewText = {},
): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const { type, locale, siteName } = OPEN_GRAPH_SITE;
  return {
    alternates: { canonical: path },
    openGraph: { type, locale, siteName, ...preview, url: path },
    twitter: { card: "summary_large_image" },
  };
}
