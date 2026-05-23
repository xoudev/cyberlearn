import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "Politique de confidentialité",
    template: "%s · Cyber Learn",
  },
};

export default function PrivacyLayout({
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

      <Footer />
    </div>
  );
}
