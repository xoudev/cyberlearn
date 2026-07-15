import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";
import "./telecharger.css";

export const metadata: Metadata = {
  title: "Télécharger l'application",
  description:
    "Installe CyberLearn sur Android ou ajoute la version web à l'écran d'accueil de ton iPhone.",
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

function BellIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4" />
    </svg>
  );
}

function HomeIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4Z" />
    </svg>
  );
}

function RouteIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h-1" />
    </svg>
  );
}

function BookIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
    </svg>
  );
}

function UserIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" />
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

function MobileAppPreview(): React.JSX.Element {
  return (
    <figure className="mobile-preview">
      <div className="mobile-preview__device">
        <div className="mobile-preview__screen">
          <div className="mobile-preview__status" aria-hidden="true">
            <span>9:41</span>
            <span>● ◒</span>
          </div>

          <div className="mobile-preview__greeting">
            <div className="mobile-preview__identity">
              <Image src="/icon_app.png" alt="" width={28} height={28} priority />
              <div>
                <span>Bon retour</span>
                <strong>@apprenti</strong>
              </div>
            </div>
            <div className="mobile-preview__bell">
              <BellIcon />
            </div>
          </div>

          <div className="mobile-preview__level">
            <div>
              <strong>Niveau 7</strong>
              <span>1 840 / 2 000 XP</span>
            </div>
            <div className="mobile-preview__xp">
              <span />
            </div>
            <small>◆ Palier Argent</small>
          </div>

          <div className="mobile-preview__section-title">
            <span>Progression</span>
            <strong>Ta série</strong>
          </div>
          <div className="mobile-preview__streak">
            <span aria-hidden="true">🔥</span>
            <div>
              <strong>12</strong>
              <small>jours de série</small>
            </div>
            <p>
              Record personnel
              <br />
              <b>18 jours</b>
            </p>
          </div>

          <div className="mobile-preview__section-title mobile-preview__section-title--resume">
            <strong>Reprends où tu t’es arrêté</strong>
          </div>
          <div className="mobile-preview__lesson">
            <span>Cybersécurité</span>
            <strong>Sécuriser une API</strong>
            <small>Continuer →</small>
          </div>

          <div className="mobile-preview__nav" aria-hidden="true">
            <span className="mobile-preview__nav-item mobile-preview__nav-item--active">
              <HomeIcon />
              Accueil
            </span>
            <span className="mobile-preview__nav-item">
              <RouteIcon />
              Parcours
            </span>
            <span className="mobile-preview__nav-item">
              <BookIcon />
              Leçons
            </span>
            <span className="mobile-preview__nav-item">
              <UserIcon />
              Profil
            </span>
          </div>
        </div>
      </div>
      <figcaption>
        <span>Écran d’accueil</span>
        <span>Application Android · v2.2</span>
      </figcaption>
    </figure>
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
          <Link href="/" className="download-brand" aria-label="CyberLearn · accueil">
            <Image src="/icon_app.png" alt="" width={32} height={32} priority />
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
        <section className="download-hero" aria-labelledby="download-title">
          <div className="download-hero__copy">
            <p className="download-kicker">Application mobile · version 2.2</p>
            <h1 id="download-title">CyberLearn, maintenant dans ta poche.</h1>
            <p className="download-hero__intro">
              Continue une leçon, relis tes notes et garde ta progression à jour, même loin de ton
              ordinateur. Ton compte est le même sur le web et sur mobile.
            </p>
            <div className="download-hero__actions">
              <a href="#installation" className="download-action">
                <span>Installer l’application</span>
                <ArrowIcon />
              </a>
              <Link href="/login" className="download-action download-action--secondary">
                Ouvrir sur le web
              </Link>
            </div>
            <dl className="download-facts">
              <div>
                <dt>Compte</dt>
                <dd>Unique</dd>
              </div>
              <div>
                <dt>Progression</dt>
                <dd>Synchronisée</dd>
              </div>
              <div>
                <dt>Sécurité</dt>
                <dd>MFA disponible</dd>
              </div>
            </dl>
          </div>

          <div className="download-hero__visual">
            <MobileAppPreview />
          </div>
        </section>

        <section className="download-product" aria-labelledby="product-title">
          <div className="download-product__inner">
            <header className="download-product__heading">
              <p className="download-kicker">Pas une version allégée</p>
              <h2 id="product-title">L’essentiel de CyberLearn te suit partout.</h2>
              <p>
                L’interface a été reconstruite pour le téléphone, avec les mêmes données et le même
                niveau de sécurité que le site.
              </p>
            </header>

            <div className="download-feature-list">
              <article>
                <span>01</span>
                <h3>Cours et parcours</h3>
                <p>
                  Reprends au bon endroit et avance dans tes parcours depuis un écran plus compact.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>Notes de leçon</h3>
                <p>Retrouve tes notes, classe-les et consulte-les quand tu en as besoin.</p>
              </article>
              <article>
                <span>03</span>
                <h3>XP et récompenses</h3>
                <p>Ton niveau, tes séries, tes badges et ton classement restent synchronisés.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="download-install" id="installation" aria-labelledby="install-title">
          <div className="download-install__heading">
            <p className="download-kicker">Téléchargement</p>
            <h2 id="install-title">Choisis ton téléphone.</h2>
            <p>
              Android dispose de son application native. Sur iPhone, CyberLearn s’installe depuis
              Safari.
            </p>
          </div>

          <div className="download-install__layout">
            <article className="download-install__platform download-install__platform--android">
              <div className="download-install__platform-heading">
                <span className="download-platform-icon download-platform-icon--android">
                  <AndroidIcon />
                </span>
                <div>
                  <p>Android</p>
                  <h3>L’application native</h3>
                </div>
              </div>
              <p className="download-install__description">
                Installe l’app depuis Google Play pour recevoir les mises à jour automatiquement. Un
                APK officiel peut aussi être proposé pour une installation directe.
              </p>
              <div className="download-install__actions">
                {androidPlayUrl ? (
                  <ExternalAction href={androidPlayUrl} label="Ouvrir Google Play" />
                ) : androidApkUrl ? (
                  <ExternalAction href={androidApkUrl} label="Télécharger l’APK" />
                ) : (
                  <div className="download-action download-action--disabled" aria-disabled="true">
                    Publication en cours
                  </div>
                )}
                {androidPlayUrl && androidApkUrl ? (
                  <ExternalAction href={androidApkUrl} label="Télécharger l’APK" secondary />
                ) : null}
              </div>
              <p className="download-install__note">
                {androidAvailable
                  ? "Télécharge toujours l’application depuis l’un des liens officiels affichés ici."
                  : "La fiche Google Play sera ajoutée ici dès que la validation sera terminée."}
              </p>
            </article>

            <article className="download-install__platform download-install__platform--ios">
              <div className="download-install__platform-heading">
                <span className="download-platform-icon download-platform-icon--ios">
                  <AppleIcon />
                </span>
                <div>
                  <p>iPhone et iPad</p>
                  <h3>{iosAppStoreUrl ? "Disponible sur l’App Store" : "Installe la web app"}</h3>
                </div>
              </div>
              <p className="download-install__description">
                {iosAppStoreUrl
                  ? "Télécharge l’application native depuis l’App Store et connecte-toi avec ton compte CyberLearn."
                  : "La version native arrivera plus tard. En attendant, Safari permet d’ajouter CyberLearn à l’écran d’accueil gratuitement."}
              </p>
              {iosAppStoreUrl ? (
                <div className="download-install__actions">
                  <ExternalAction href={iosAppStoreUrl} label="Ouvrir l’App Store" />
                </div>
              ) : (
                <ol className="download-ios-steps">
                  <li>
                    <span>1</span>
                    Ouvre cyberlearn.fr dans Safari
                  </li>
                  <li>
                    <span>2</span>
                    Touche le bouton Partager
                  </li>
                  <li>
                    <span>3</span>
                    Choisis « Sur l’écran d’accueil »
                  </li>
                </ol>
              )}
              {!iosAppStoreUrl ? (
                <div className="download-install__actions">
                  <Link href="/login" className="download-action">
                    <span>Ouvrir CyberLearn</span>
                    <ArrowIcon />
                  </Link>
                </div>
              ) : null}
            </article>
          </div>
        </section>
      </main>

      <footer className="download-footer">
        <div>
          <Link href="/" className="download-brand">
            <Image src="/icon_app.png" alt="" width={26} height={26} />
            <span>
              cyber<b>learn</b>
            </span>
          </Link>
          <nav aria-label="Liens de pied de page">
            <Link href="/privacy">Confidentialité</Link>
            <Link href="/legal">Mentions légales</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <span>© {new Date().getFullYear()} CyberLearn</span>
        </div>
      </footer>
    </div>
  );
}
