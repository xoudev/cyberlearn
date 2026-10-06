import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "Mentions légales",
    template: "%s · Cyber Learn",
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
        background: "var(--color-bg-base)",
        color: "var(--color-text-secondary)",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--color-border-subtle)",
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
            color: "var(--color-border-subtle)",
            fontSize: "13px",
          }}
        >
          /
        </span>
        <span
          style={{
            color: "var(--color-text-primary)",
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

      <Footer />
    </div>
  );
}
