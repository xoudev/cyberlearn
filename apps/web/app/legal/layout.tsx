import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Mentions légales",
    template: "%s — Cyber Learn",
  },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        color: "#B8B5D1",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1F1B47",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Link href="/" className="legal-back-link">
          ← Retour
        </Link>
        <span
          style={{
            color: "#1F1B47",
            fontSize: "13px",
          }}
        >
          /
        </span>
        <span
          style={{
            color: "#F5F5FA",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Cyber Learn
        </span>
      </header>

      <main
        style={{
          maxWidth: "768px",
          margin: "0 auto",
          padding: "48px 24px 96px",
        }}
      >
        {children}
      </main>

      <footer
        style={{
          borderTop: "1px solid #1F1B47",
          padding: "16px 24px",
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/legal/cgu"
          style={{ color: "#6B6890", fontSize: "12px", textDecoration: "none" }}
        >
          CGU
        </Link>
        <Link
          href="/legal/cgv"
          style={{ color: "#6B6890", fontSize: "12px", textDecoration: "none" }}
        >
          CGV
        </Link>
        <Link
          href="/contact"
          style={{ color: "#6B6890", fontSize: "12px", textDecoration: "none" }}
        >
          Contact
        </Link>
      </footer>
    </div>
  );
}
