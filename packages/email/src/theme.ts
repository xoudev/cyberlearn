import type React from "react";

/**
 * The site's design system, for a medium that cannot read a stylesheet.
 *
 * Every template carried its own copy of this - nine of them, a hundred-odd
 * lines each, all nearly the same. That is not only repetition: it is the
 * mechanism by which the mails drifted away from the site. A rounded corner
 * introduced once has to be unpicked nine times, so it never is, and after a
 * while the mails are a second design nobody decided on.
 *
 * The colours here are the dark-theme values from packages/ui/src/tokens.css,
 * written out rather than referenced because a custom property does not survive
 * a mail client. Their names are the token names, so a reader can check one
 * against the other. The shape and the type are where the mails had actually
 * left the system:
 *
 *   Corners. The site is square - `border-radius: 0` is its dominant rule and
 *   the exceptions are 2px. The mails had a 12px card and an 8px button, which
 *   is the single loudest reason they did not look like the product.
 *
 *   Type. The site pairs Plus Jakarta Sans with JetBrains Mono, and uses the
 *   mono uppercase with wide tracking for every eyebrow and small label. The
 *   mails named Inter - a font the site does not use anywhere - and set the
 *   wordmark in it.
 *
 * Fonts are named first and fall back: a client that has them, or honours the
 * webfont, matches the site; the rest degrade to the system stack rather than
 * to something that was never the brand.
 */

export const tokens = {
  bgBase: "#030219",
  bgElevated: "#0A0826",
  bgOverlay: "#110F33",

  borderSubtle: "#1F1B47",
  borderDefault: "#2A2560",

  textPrimary: "#F5F5FA",
  textSecondary: "#B8B5D1",
  textMuted: "#6B6890",
  textDisabled: "#3F3D5C",

  brandBlue: "#0024FF",
  brandTurquoise: "#0AFFD4",

  /** The lighter blue the app uses for links on dark panels. */
  link: "#4D8BFF",
  warning: "#FFB020",
  danger: "#FF6B7A",
} as const;

export const fonts = {
  sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

/**
 * The shared vocabulary. A template picks from it and adds only what is its
 * own - the code block on a login link, the two nouns on a piece of work.
 */
export const styles = {
  main: {
    backgroundColor: tokens.bgBase,
    fontFamily: fonts.sans,
    padding: "40px 0",
  } satisfies React.CSSProperties,

  container: {
    maxWidth: "520px",
    margin: "0 auto",
  } satisfies React.CSSProperties,

  logoSection: {
    paddingBottom: "20px",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  /** The wordmark, in the mono the site sets every eyebrow in. */
  logoText: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.25em",
    color: tokens.brandTurquoise,
    margin: "0",
  } satisfies React.CSSProperties,

  card: {
    backgroundColor: tokens.bgElevated,
    // The hairline the app draws its panels with, not the subtler one: on a
    // flat card at this size the subtle border disappears entirely.
    border: `1px solid ${tokens.borderDefault}`,
    padding: "40px 36px",
  } satisfies React.CSSProperties,

  heading: {
    fontFamily: fonts.sans,
    fontSize: "24px",
    fontWeight: "800",
    color: tokens.textPrimary,
    margin: "0 0 16px",
    letterSpacing: "-0.02em",
  } satisfies React.CSSProperties,

  paragraph: {
    fontSize: "14px",
    color: tokens.textSecondary,
    lineHeight: "1.65",
    margin: "0 0 14px",
  } satisfies React.CSSProperties,

  listItem: {
    fontSize: "14px",
    color: tokens.textSecondary,
    lineHeight: "1.65",
    margin: "0 0 6px",
  } satisfies React.CSSProperties,

  /** The accent-edged block the app uses to set a fact apart. */
  detail: {
    borderLeft: `3px solid ${tokens.brandTurquoise}`,
    paddingLeft: "14px",
    margin: "22px 0 4px",
  } satisfies React.CSSProperties,

  detailLine: {
    fontSize: "15px",
    color: tokens.textPrimary,
    margin: "0 0 4px",
  } satisfies React.CSSProperties,

  detailStrong: {
    color: tokens.textPrimary,
  } satisfies React.CSSProperties,

  /** The mono micro-label above a fact, as on every panel in the app. */
  detailMuted: {
    fontFamily: fonts.mono,
    fontSize: "10px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: tokens.textMuted,
    margin: "0 0 3px",
  } satisfies React.CSSProperties,

  buttonWrap: {
    margin: "28px 0",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  button: {
    backgroundColor: tokens.brandBlue,
    color: "#ffffff",
    fontFamily: fonts.mono,
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    padding: "14px 32px",
    textDecoration: "none",
    display: "inline-block",
  } satisfies React.CSSProperties,

  hr: {
    borderColor: tokens.borderSubtle,
    margin: "24px 0",
  } satisfies React.CSSProperties,

  muted: {
    fontSize: "12px",
    color: tokens.textMuted,
    lineHeight: "1.5",
    margin: "0",
  } satisfies React.CSSProperties,

  footer: {
    paddingTop: "20px",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  footerText: {
    fontFamily: fonts.mono,
    fontSize: "10px",
    letterSpacing: "0.06em",
    color: tokens.textDisabled,
    margin: "0 0 4px",
  } satisfies React.CSSProperties,

  footerLink: {
    // Named, not inherited from the mono footer around it: a mail client that
    // injects its own link styling resets the family along with the colour.
    fontFamily: fonts.mono,
    color: tokens.link,
    textDecoration: "none",
  } satisfies React.CSSProperties,
} as const;
