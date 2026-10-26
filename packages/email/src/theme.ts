import type React from "react";

// Mail clients need literal colours and font fallbacks rather than CSS variables.
export const tokens = {
  bgBase: "#0B0C0E",
  bgElevated: "#121418",
  bgOverlay: "#191C22",
  paper: "#EAE7DF",
  ink: "#141518",
  borderSubtle: "#44454A",
  borderDefault: "#74767D",
  textPrimary: "#F4F2ED",
  textSecondary: "#C2BFB8",
  textMuted: "#AAA79F",
  textDisabled: "#AAA79F",
  brandBlue: "#FF6B2B",
  brandTurquoise: "#FF6B2B",
  link: "#FF864F",
  warning: "#FFC36E",
  danger: "#FF929B",
} as const;

export const fonts = {
  sans: "'Space Grotesk', Arial, Helvetica, sans-serif",
  display: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

export const styles = {
  main: {
    backgroundColor: tokens.bgBase,
    color: tokens.textPrimary,
    fontFamily: fonts.sans,
    padding: "28px 12px",
    margin: "0",
  } satisfies React.CSSProperties,
  container: {
    width: "100%",
    maxWidth: "560px",
    margin: "0 auto",
  } satisfies React.CSSProperties,
  logoSection: {
    backgroundColor: tokens.paper,
    padding: "18px 24px",
  } satisfies React.CSSProperties,
  card: {
    backgroundColor: tokens.bgElevated,
    border: `1px solid ${tokens.borderDefault}`,
    borderTop: `4px solid ${tokens.brandBlue}`,
    padding: "32px 24px",
  } satisfies React.CSSProperties,
  heading: {
    fontFamily: fonts.display,
    fontSize: "36px",
    lineHeight: "1.1",
    fontWeight: "600",
    color: tokens.textPrimary,
    margin: "0 0 24px",
    letterSpacing: "-0.02em",
  } satisfies React.CSSProperties,
  paragraph: {
    fontSize: "16px",
    color: tokens.textSecondary,
    lineHeight: "1.7",
    margin: "0 0 16px",
    overflowWrap: "anywhere",
  } satisfies React.CSSProperties,
  listItem: {
    fontSize: "15px",
    color: tokens.textSecondary,
    lineHeight: "1.7",
    margin: "0 0 8px",
  } satisfies React.CSSProperties,
  detail: {
    borderLeft: `3px solid ${tokens.brandTurquoise}`,
    paddingLeft: "16px",
    margin: "24px 0 8px",
  } satisfies React.CSSProperties,
  detailLine: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: tokens.textPrimary,
    margin: "0 0 6px",
    overflowWrap: "anywhere",
  } satisfies React.CSSProperties,
  detailStrong: {
    color: tokens.textPrimary,
  } satisfies React.CSSProperties,
  detailMuted: {
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    color: tokens.textMuted,
    margin: "0 0 6px",
  } satisfies React.CSSProperties,
  buttonWrap: {
    margin: "28px 0",
  } satisfies React.CSSProperties,
  button: {
    backgroundColor: tokens.brandBlue,
    color: tokens.ink,
    fontFamily: fonts.sans,
    fontSize: "15px",
    lineHeight: "20px",
    fontWeight: "700",
    padding: "15px 22px",
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    boxSizing: "border-box",
    maxWidth: "100%",
  } satisfies React.CSSProperties,
  hr: {
    borderColor: tokens.borderSubtle,
    margin: "28px 0",
  } satisfies React.CSSProperties,
  dangerButton: {
    backgroundColor: tokens.danger,
    color: tokens.ink,
  } satisfies React.CSSProperties,
  muted: {
    fontSize: "14px",
    color: tokens.textMuted,
    lineHeight: "1.7",
    margin: "0",
  } satisfies React.CSSProperties,
  footer: {
    padding: "24px 12px 0",
  } satisfies React.CSSProperties,
  footerText: {
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.7",
    color: tokens.textMuted,
    margin: "0 0 4px",
  } satisfies React.CSSProperties,
  footerLink: {
    fontFamily: fonts.sans,
    color: tokens.link,
    textDecoration: "underline",
    display: "inline-block",
    padding: "12px 0",
  } satisfies React.CSSProperties,
} as const;
