import React from "react";

/**
 * The frame of the two pages a notice's link leads to: somebody arriving from
 * an e-mail, signed out, who needs one sentence and at most one button.
 */
export function KeepCard({
  tag,
  title,
  children,
}: {
  /** The status line above the title, in the site's terminal voice. */
  tag: string;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="card card--sunken"
        style={{
          maxWidth: 520,
          width: "100%",
          borderTop: "2px solid var(--color-brand-turquoise)",
          padding: "32px 28px",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--color-text-muted)",
            margin: "0 0 16px",
          }}
        >
          {tag}
        </p>
        <h1
          style={{
            color: "var(--color-text-primary)",
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 16px",
          }}
        >
          {title}
        </h1>
        <div style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </main>
  );
}

export const keepButtonStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  padding: "12px 20px",
  background: "var(--color-brand-turquoise)",
  color: "var(--color-bg-base)",
  border: "none",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "none",
};
