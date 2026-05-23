import React from "react";
import Link from "next/link";

/** Minimal footer shown at the bottom of authenticated app pages. */
export function Footer(): React.JSX.Element {
  return (
    <footer
      className="border-t px-6 py-4"
      style={{
        borderColor: "var(--color-border-subtle)",
        color: "var(--color-text-muted)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>© {new Date().getFullYear()} Cyber Learn</span>
        <nav aria-label="Liens de pied de page" className="flex gap-4">
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link href="/verify" className="transition-colors hover:text-foreground">
            Vérifier un certificat
          </Link>
          <Link href="/legal/cgu" className="transition-colors hover:text-foreground">
            CGU
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/legal" className="transition-colors hover:text-foreground">
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
