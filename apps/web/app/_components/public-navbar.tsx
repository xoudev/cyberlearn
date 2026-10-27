import Link from "next/link";
import { BastionLogo } from "@/components/bastion-logo";
import { brandTypeface } from "@/components/brand-typeface";
import "./landing.css";

export function PublicNavbar(): React.JSX.Element {
  return (
    <nav className={`home-nav ${brandTypeface}`} aria-label="Navigation principale">
      <div className="home-nav-inner">
        <Link href="/" aria-label="CyberLearn, accueil" className="home-wordmark">
          <BastionLogo size={33} />
          <span>
            CyberLearn<span className="home-brand-stop">.</span>
          </span>
        </Link>
        <div className="home-nav-links">
          <Link href="/catalogue">Les parcours</Link>
          <Link href="/download">L&apos;application</Link>
        </div>
        <div className="home-nav-actions">
          <Link href="/login" className="home-nav-login">
            Connexion
          </Link>
          <Link href="/register" className="home-button home-button--primary">
            <span className="home-nav-register-long">Commencer gratuitement</span>
            <span className="home-nav-register-short">Commencer</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
