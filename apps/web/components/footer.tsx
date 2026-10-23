import React from "react";
import Link from "next/link";
import { newRequestHref } from "@/app/(app)/support/_components/new-request-query";

/**
 * A footer link: as tall as a finger (44px), whatever the 12px text says. They
 * were bare text, 16px high, with the next row of links a few pixels away.
 */
const LINK = "inline-flex min-h-11 items-center transition-colors hover:text-foreground";

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
      className="border-t px-6 py-1"
      style={{
        borderColor: "var(--color-border-subtle)",
        color: "var(--color-text-muted)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="py-2">© {new Date().getFullYear()} Cyber Learn</span>
        <nav aria-label="Liens de pied de page" className="flex flex-wrap gap-x-4">
          <Link href="/download" className={LINK}>
            Application mobile
          </Link>
          <Link href={signedIn ? newRequestHref() : "/contact"} className={LINK}>
            Contact
          </Link>
          <Link href="/verify" className={LINK}>
            Vérifier un certificat
          </Link>
          <Link href="/legal/terms" className={LINK}>
            CGU
          </Link>
          <Link href="/privacy" className={LINK}>
            Confidentialité
          </Link>
          <Link href="/legal" className={LINK}>
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
