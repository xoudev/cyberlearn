import Image from "next/image";
import Link from "next/link";

export function PublicNavbar(): React.JSX.Element {
  return (
    <nav
      className="landing-nav"
      aria-label="Navigation principale"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        background: "rgba(3,2,25,0.7)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        borderBottom: "1px solid #1A1640",
      }}
    >
      <Link
        href="/"
        aria-label="CyberLearn · accueil"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "#F5F5FA",
        }}
      >
        <Image
          src="/icon_app.png"
          alt=""
          width={32}
          height={32}
          priority
          style={{ objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.01em",
          }}
        >
          cyber<span style={{ color: "#0AFFD4" }}>learn</span>
        </span>
      </Link>
      <div className="landing-nav-actions">
        <Link href="/download" className="landing-nav-download">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <path d="M11 18h2" />
          </svg>
          <span className="landing-nav-download-label">Application</span>
        </Link>
        <Link
          href="/login"
          className="landing-nav-signin"
          style={{
            alignItems: "center",
            padding: "11px 20px",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            border: "1px solid #1F1B47",
            background: "transparent",
            color: "#B8B5D1",
            textDecoration: "none",
            transition: "border-color 180ms ease, color 180ms ease",
          }}
        >
          Connexion
        </Link>
        <Link
          href="/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            background: "#0024FF",
            border: "1px solid #0024FF",
            color: "#fff",
            textDecoration: "none",
            boxShadow: "0 0 20px rgba(0,36,255,0.4)",
            transition: "background 180ms ease",
          }}
        >
          <span className="landing-cta-long">Commencer gratuitement</span>
          <span className="landing-cta-short">Commencer</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8 H13 M9 4 L13 8 L9 12" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
