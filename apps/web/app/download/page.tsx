import type { Metadata } from "next";
import Link from "next/link";
import { BastionLogo } from "@/components/bastion-logo";
import { PublicNavbar } from "@/app/_components/public-navbar";
import { pageAddress } from "@/app/page-metadata";
import { env } from "@/lib/env";
import { availabilityLine, installIntro } from "./availability";
import "./download.css";

export const metadata: Metadata = {
  title: "Télécharger l’application",
  description:
    "Installe CyberLearn sur Android ou ajoute la version web à l’écran d’accueil de ton iPhone.",
  ...pageAddress("/download"),
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

export default function DownloadPage(): React.JSX.Element {
  const androidPlayUrl = env.NEXT_PUBLIC_ANDROID_PLAY_URL;
  const androidApkUrl = env.NEXT_PUBLIC_ANDROID_APK_URL;
  const iosAppStoreUrl = env.NEXT_PUBLIC_IOS_APP_STORE_URL;
  const androidAvailable = Boolean(androidPlayUrl ?? androidApkUrl);
  const stores = { android: androidAvailable, iosAppStore: Boolean(iosAppStoreUrl) };
  const androidNotifyUrl =
    "/contact?theme=FEATURE_REQUEST&subject=Disponibilit%C3%A9%20de%20l%27application%20Android";

  return (
    <div className="download-page">
      <PublicNavbar />
      <main id="contenu">
        <section className="download-hero" aria-labelledby="download-title">
          <div className="download-hero__copy">
            <p className="download-kicker">CyberLearn / Application mobile</p>
            <h1 id="download-title">
              Le même compte.
              <br />
              <em>Un autre écran.</em>
            </h1>
            <p className="download-hero__intro">
              Continue une leçon, relis tes notes et garde ta progression à jour, même loin de ton
              ordinateur. Ton compte est le même sur le web et sur mobile.
            </p>
            <div className="download-hero__actions">
              {androidAvailable ? (
                <a href="#installation" className="download-action">
                  Installer l’application
                </a>
              ) : (
                <Link href={androidNotifyUrl} className="download-action">
                  Être prévenu du lancement
                </Link>
              )}
              <Link href="/login" className="download-action download-action--secondary">
                Ouvrir sur le web
              </Link>
            </div>
            <p className="download-hero__availability">{availabilityLine(stores)}</p>
          </div>
          <aside className="download-poster" aria-label="CyberLearn sur mobile">
            <BastionLogo size={88} />
            <p>
              Apprendre.
              <br />
              Pratiquer.
              <br />
              <em>Recommencer.</em>
            </p>
            <span>Développement / Cybersécurité / Réseaux</span>
            <a href="#installation">Choisir ton installation</a>
          </aside>
        </section>
        <dl className="download-stats" aria-label="Informations sur l’application">
          <div>
            <dt>Android</dt>
            <dd>{androidAvailable ? "Application native" : "Publication en cours"}</dd>
          </div>
          <div>
            <dt>iPhone</dt>
            <dd>{iosAppStoreUrl ? "Application native" : "Web app installable"}</dd>
          </div>
          <div>
            <dt>Compte</dt>
            <dd>Progression synchronisée</dd>
          </div>
          <div>
            <dt>Sécurité</dt>
            <dd>MFA disponible</dd>
          </div>
        </dl>
        <section className="download-product" aria-labelledby="product-title">
          <div className="download-product__inner">
            <header className="download-product__heading">
              <p className="download-section-index">Dans l’application</p>
              <h2 id="product-title">
                Ton apprentissage
                <br />
                <em>te suit.</em>
              </h2>
              <p>Retrouve les parcours, les notes et la progression de ton compte sur téléphone.</p>
            </header>
            <div className="download-feature-list">
              <article>
                <span aria-hidden="true">01</span>
                <h3>Reprends au bon endroit</h3>
                <p>Continue tes cours et tes parcours sans perdre ta progression.</p>
              </article>
              <article>
                <span aria-hidden="true">02</span>
                <h3>Ton bloc-notes te suit</h3>
                <p>Consulte et classe les notes enregistrées pendant tes leçons.</p>
              </article>
              <article>
                <span aria-hidden="true">03</span>
                <h3>Tout reste synchronisé</h3>
                <p>XP, niveaux, séries, badges et classement utilisent les mêmes données.</p>
              </article>
            </div>
          </div>
        </section>
        <section className="download-install" id="installation" aria-labelledby="install-title">
          <div className="download-install__heading">
            <p className="download-section-index">Installation</p>
            <h2 id="install-title">Choisis ton téléphone.</h2>
            <p>{installIntro(stores)}</p>
          </div>

          <div className="download-install__layout">
            <article className="download-install__platform download-install__platform--android">
              <div className="download-install__platform-heading">
                <span className="download-platform-icon download-platform-icon--android">
                  <AndroidIcon />
                </span>
                <div>
                  <p>Android</p>
                  <h3>{androidAvailable ? "L’application native" : "Publication en cours"}</h3>
                </div>
              </div>
              <p className="download-install__description">
                {androidAvailable
                  ? "Installe l’app depuis Google Play pour recevoir les mises à jour automatiquement. Un APK officiel peut aussi être proposé pour une installation directe."
                  : "L’application Android est en cours de publication. Laisse-nous un message pour être prévenu dès que le lien officiel sera disponible."}
              </p>
              <div className="download-install__actions">
                {androidPlayUrl ? (
                  <ExternalAction href={androidPlayUrl} label="Ouvrir Google Play" />
                ) : androidApkUrl ? (
                  <ExternalAction href={androidApkUrl} label="Télécharger l’APK" />
                ) : (
                  <Link href={androidNotifyUrl} className="download-action">
                    Être prévenu
                  </Link>
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
          <Link href="/" className="download-brand" aria-label="CyberLearn · accueil">
            <BastionLogo size={28} />
            <span>
              CyberLearn<b>.</b>
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
