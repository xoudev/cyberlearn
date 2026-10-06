"use client";

import { z } from "zod";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

const externalLinkPropsSchema = z.object({
  href: z.url(),
  children: z.string().optional(),
  /** Optional short description shown below the link label */
  description: z.string().optional(),
  /** "link" - inline text link | "card" (default) - standalone card block */
  variant: z.enum(["card", "link"]).optional().default("card"),
});

type ExternalLinkProps = z.input<typeof externalLinkPropsSchema> & {
  children?: React.ReactNode;
};

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

function isSafeUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return ALLOWED_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function ExternalLink(rawProps: ExternalLinkProps): React.JSX.Element {
  const { children, ...rest } = rawProps;
  const result = externalLinkPropsSchema.safeParse({
    ...rest,
    children: typeof children === "string" ? children : undefined,
  });

  if (!result.success || !isSafeUrl(result.data.href)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[ExternalLink] invalid props:",
        result.success ? "unsafe URL" : z.flattenError(result.error),
      );
    }
    return (
      <span
        style={{
          color: "var(--color-category-cybersec)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
        }}
      >
        [ExternalLink] URL invalide
      </span>
    );
  }

  const { href, description, variant } = result.data;
  const label =
    typeof children === "string" && children.length > 0 ? children : (result.data.children ?? href);

  if (variant === "link") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--color-info)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          borderBottom: "1px solid rgba(77,139,255,0.3)",
          transition: "border-color 150ms ease, color 150ms ease",
        }}
        onMouseEnter={(e) => {
          const a = e.currentTarget;
          a.style.borderBottomColor = "var(--color-info)";
          a.style.color = "#7AAAFF";
        }}
        onMouseLeave={(e) => {
          const a = e.currentTarget;
          a.style.borderBottomColor = "rgba(77,139,255,0.3)";
          a.style.color = "var(--color-info)";
        }}
      >
        {label}
        <ExternalLinkIcon size={11} aria-hidden />
      </a>
    );
  }

  // Card variant
  let hostname = href;
  try {
    hostname = new URL(href).hostname;
  } catch {
    // fallback to full href
  }

  return (
    <a
      className="card card--sunken"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        margin: "1.5rem 0",
        padding: "14px 18px",
        textDecoration: "none",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--color-border-default)";
        el.style.boxShadow =
          "0 0 0 1px var(--color-border-default), 0 4px 24px color-mix(in srgb, var(--cosmetic-accent) 6%, transparent)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--color-border-subtle)";
        el.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(77,139,255,0.08)",
          border: "1px solid rgba(77,139,255,0.2)",
          color: "var(--color-info)",
        }}
      >
        <ExternalLinkIcon size={16} aria-hidden />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: description ? "4px" : "6px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>

        {description && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
              lineHeight: "1.4",
            }}
          >
            {description}
          </div>
        )}

        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hostname}
        </div>
      </div>
    </a>
  );
}
