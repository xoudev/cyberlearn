import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";
import "./telecharger.css";

export const metadata: Metadata = {
  title: "Télécharger l'application",
  description:
    "Installe Cyber Learn sur Android ou ajoute la version web à l'écran d'accueil de ton iPhone.",
  alternates: { canonical: "/telecharger" },
};

function AndroidIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.3 5.5 4.4M16.8 7.3l1.7-2.9M6.4 8.2h11.2c1.1 0 2 .9 2 2v7.1c0 .8-.7 1.5-1.5 1.5H5.9c-.8 0-1.5-.7-1.5-1.5v-7.1c0-1.1.9-2 2-2ZM8.2 12v.1M15.8 12v.1M7.2 18.8v2M16.8 18.8v2M4.4 11v5.1M19.6 11v5.1" />
    </svg>
  );
}

function AppleIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.8 12.7c0-2 1.6-3 1.7-3.1A3.8 3.8 0 0 0 15.4 8c-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.8 1.1 9 .8 1 1.6 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2-1 2.7-2.1.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.5-1-2.5-4ZM14.5 6.6A3.7 3.7 0 0 0 15.4 4a3.8 3.8 0 0 0-2.5 1.3 3.5 3.5 0 0 0-.9 2.5c.9.1 1.8-.4 2.5-1.2Z" />
    </svg>
  );
}

function ArrowIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function ExternalAction({
  href,
  label,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
}): React.JSX.Element {
  return (
    <a
      href={href}
      className={secondary ? "download-action download-action--secondary" : "download-action"}
      target="_blank"
      rel="noreferrer"
    >
      <span>{label}</span>
      <ArrowIcon />
    </a>
  );
}

function PhonePreview(): React.JSX.Element {
  return (
    <div className="download-phone" aria-label="Aperçu de l'application Cyber Learn">
      <div className="download-phone__sensor" aria-hidden="true" />
      <div className="download-phone__header">
        <Image
          src="/icon_app.png"
          alt=""
          width={30}
          height={30}
          priority
          style={{ width: 30, height: 30 }}
        />
        <div>
          <span>CYBER LEARN</span>
          <strong>Salut, apprenti</strong>
        </div>
      </div>
      <div className="download-phone__progress">
        <div>
          <span>PROGRESSION</span>
          <b>LVL · 7</b>
        </div>
        <strong>1 840 XP</strong>
        <div className="download-phone__bar">
          <span />
        </div>
      </div>
      <div className="download-phone__label">À CONTINUER</div>
      <div className="download-phone__lesson">
        <i className="download-phone__dot download-phone__dot--cyan" />
        <div>
          <strong>Sécuriser une API</strong>
          <span>Cybersécurité · 12 min</span>
        </div>
        <b>68%</b>
      </div>
      <div className="download-phone__lesson">
        <i className="download-phone__dot download-phone__dot--blue" />
        <div>
          <strong>Réseaux TCP/IP</strong>
          <span>Réseau · 18 min</span>
        </div>
        <b>24%</b>
      </div>
      <div className="download-phone__nav" aria-hidden="true">
        <span className="download-phone__nav-item--active">⌂</span>
        <span>⌁</span>
        <span>◇</span>
        <span>○</span>
      </div>
    </div>
  );
}

export default function DownloadPage(): React.JSX.Element {
  const androidPlayUrl = env.NEXT_PUBLIC_ANDROID_PLAY_URL;
  const androidApkUrl = env.NEXT_PUBLIC_ANDROID_APK_URL;
  const iosAppStoreUrl = env.NEXT_PUBLIC_IOS_APP_STORE_URL;
  const androidAvailable = Boolean(androidPlayUrl ?? androidApkUrl);

  return (
    <div className="download-page">
      <header className="download-header">
        <div className="download-header__inner">
          <Link href="/" className="download-brand" aria-label="Cyber Learn · accueil">
            <Image
              src="/icon_app.png"
              alt=""
              width={32}
              height={32}
              priority
              style={{ width: 32, height: 32 }}
            />
            <span>
              cyber<b>learn</b>
            </span>
          </Link>
          <nav className="download-header__nav" aria-label="Navigation principale">
            <Link href="/">Accueil</Link>
            <Link href="/login" className="download-header__login">
              Se connecter
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="download-hero">
          <div className="download-hero__copy">
            <div className="download-kicker">
              <span aria-hidden="true" />
              APPLICATION MOBILE
            </div>
            <h1>
              Apprends partout.
              <br />
              <em>Reprends exactement où tu t’es arrêté.</em>
            </h1>
            <p>
              Tes leçons, tes notes, ton XP et ta progression restent synchronisés entre le site et
              l’application mobile Cyber Learn.
            </p>
            <div className="download-hero__actions">
              <a href="#plateformes" className="download-action">
                <span>Choisir ma version</span>
                <ArrowIcon />
              </a>
              <Link href="/login" className="download-action download-action--secondary">
                Continuer sur le web
              </Link>
            </div>
            <ul className="download-benefits" aria-label="Avantages de l'application">
              <li>Progression synchronisée</li>
              <li>Notes accessibles partout</li>
              <li>Expérience pensée pour le mobile</li>
            </ul>
          </div>
          <div className="download-hero__visual">
            <div className="download-orbit download-orbit--one" aria-hidden="true" />
            <div className="download-orbit download-orbit--two" aria-hidden="true" />
            <PhonePreview />
            <div className="download-float-card download-float-card--xp">
              <span>SESSION TERMINÉE</span>
              <strong>+120 XP</strong>
            </div>
            <div className="download-float-card download-float-card--sync">
              <span className="download-float-card__status" aria-hidden="true" />
              Progression à jour
            </div>
          </div>
        </section>

        <section className="download-platforms" id="plateformes" aria-labelledby="platform-title">
          <div className="download-section-heading">
            <span>CHOISIS TON INSTALLATION</span>
            <h2 id="platform-title">Deux plateformes, deux chemins clairs.</h2>
            <p>
              Android peut être installé nativement dès que le canal est publié. Sur iPhone, la
              version web installable reste gratuite.
            </p>
          </div>

          <div className="download-platform-grid">
            <article className="download-platform-card download-platform-card--android">
              <div className="download-platform-card__top">
                <div className="download-platform-icon download-platform-icon--android">
                  <AndroidIcon />
                </div>
                <span
                  className={
                    androidAvailable ? "download-status download-status--ready" : "download-status"
                  }
                >
                  {androidAvailable ? "Disponible" : "Publication en cours"}
                </span>
              </div>
              <div>
                <span className="download-platform-card__eyebrow">ANDROID</span>
                <h3>L’application complète</h3>
                <p>
                  Google Play est le canal recommandé pour recevoir les mises à jour. L’APK direct
                  reste disponible comme solution alternative lorsqu’il est publié.
                </p>
              </div>
              <div className="download-platform-card__actions">
                {androidPlayUrl ? (
                  <ExternalAction href={androidPlayUrl} label="Ouvrir dans Google Play" />
                ) : androidApkUrl ? (
                  <ExternalAction href={androidApkUrl} label="Télécharger l'APK" />
                ) : (
                  <div className="download-action download-action--disabled" aria-disabled="true">
                    Version Android bientôt disponible
                  </div>
                )}
                {androidPlayUrl && androidApkUrl ? (
                  <ExternalAction href={androidApkUrl} label="Télécharger l'APK" secondary />
                ) : null}
              </div>
              <p className="download-platform-note">
                Un APK installé hors Play Store peut déclencher un avertissement Android.
                Télécharge-le uniquement depuis le lien officiel affiché ici.
              </p>
            </article>

            <article className="download-platform-card download-platform-card--ios">
              <div className="download-platform-card__top">
                <div className="download-platform-icon download-platform-icon--ios">
                  <AppleIcon />
                </div>
                <span className="download-status download-status--web">
                  {iosAppStoreUrl ? "App Store" : "Web app gratuite"}
                </span>
              </div>
              <div>
                <span className="download-platform-card__eyebrow">IPHONE & IPAD</span>
                <h3>
                  {iosAppStoreUrl ? "Disponible sur l'App Store" : "Installe le site comme une app"}
                </h3>
                <p>
                  {iosAppStoreUrl
                    ? "Installe la version native depuis l'App Store, ou utilise la version web sans téléchargement."
                    : "Sans abonnement développeur Apple, une application native ne peut pas être distribuée publiquement. Safari permet toutefois d'ajouter Cyber Learn à l'écran d'accueil gratuitement."}
                </p>
              </div>
              <div className="download-platform-card__actions">
                {iosAppStoreUrl ? (
                  <ExternalAction href={iosAppStoreUrl} label="Ouvrir dans l'App Store" />
                ) : (
                  <Link href="/login" className="download-action">
                    <span>Ouvrir la version web</span>
                    <ArrowIcon />
                  </Link>
                )}
              </div>
              <ol className="download-ios-steps">
                <li>
                  <span>01</span>
                  Ouvre cyberlearn.fr dans Safari
                </li>
                <li>
                  <span>02</span>
                  Touche Partager
                </li>
                <li>
                  <span>03</span>
                  Choisis « Ajouter à l’écran d’accueil »
                </li>
              </ol>
            </article>
          </div>
        </section>

        <section className="download-explainer" aria-labelledby="distribution-title">
          <div>
            <span className="download-explainer__number">01</span>
            <div>
              <h2 id="distribution-title">Pourquoi l’iPhone est différent</h2>
              <p>
                Apple demande un abonnement développeur annuel pour signer et distribuer une app
                native au public. Un fichier IPA posé sur un site ne serait pas installable
                librement sur les iPhone des utilisateurs.
              </p>
            </div>
          </div>
          <div>
            <span className="download-explainer__number">02</span>
            <div>
              <h2>La stratégie retenue</h2>
              <p>
                Publier Android maintenant, proposer la web app installable sur iOS, puis activer le
                bouton App Store le jour où Cyber Learn rejoint le programme développeur Apple.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="download-footer">
        <div>
          <Link href="/" className="download-brand">
            <Image
              src="/icon_app.png"
              alt=""
              width={26}
              height={26}
              style={{ width: 26, height: 26 }}
            />
            <span>
              cyber<b>learn</b>
            </span>
          </Link>
          <nav aria-label="Liens de pied de page">
            <Link href="/privacy">Confidentialité</Link>
            <Link href="/legal">Mentions légales</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <span>© {new Date().getFullYear()} Cyber Learn</span>
        </div>
      </footer>
    </div>
  );
}
