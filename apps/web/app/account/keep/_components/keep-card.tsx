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
        backgroundColor: "#030219",
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
          borderTop: "2px solid #0AFFD4",
          padding: "32px 28px",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#7F7BA9",
            margin: "0 0 16px",
          }}
        >
          {tag}
        </p>
        <h1 style={{ color: "#F5F5FA", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>
          {title}
        </h1>
        <div style={{ color: "#B8B5D1", fontSize: 15, lineHeight: 1.6 }}>{children}</div>
      </div>
    </main>
  );
}

export const keepButtonStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  padding: "12px 20px",
  background: "#0AFFD4",
  color: "#030219",
  border: "none",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "none",
};
