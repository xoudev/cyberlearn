import React from "react";
import Link from "next/link";
import { newRequestHref } from "@/app/(app)/support/_components/new-request-query";

/**
 * Minimal footer shown at the bottom of authenticated app pages, and of the
 * legal pages around the site.
 *
 * `signedIn` is for the app's own shell: its "Contact" opens the request
 * window, answered at the account's address, instead of the visitors' form on
 * a page outside the app where the address is typed by hand. The legal pages
 * are read signed out as often as not, so they keep the public form.
 */
export function Footer({ signedIn = false }: { signedIn?: boolean }): React.JSX.Element {
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
        <nav aria-label="Liens de pied de page" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/download" className="transition-colors hover:text-foreground">
            Application mobile
          </Link>
          <Link
            href={signedIn ? newRequestHref() : "/contact"}
            className="transition-colors hover:text-foreground"
          >
            Contact
          </Link>
          <Link href="/verify" className="transition-colors hover:text-foreground">
            Vérifier un certificat
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">
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
