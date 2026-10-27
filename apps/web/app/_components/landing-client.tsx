import type React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen, CodeXml, Network, ShieldCheck } from "lucide-react";
import type { FeaturedPath, LandingStats } from "@cyberlearn/db";
import { formatNumberFr } from "@cyberlearn/lib";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { BastionLogo } from "@/components/bastion-logo";
import { brandTypeface } from "@/components/brand-typeface";
import { PublicNavbar } from "./public-navbar";
import { LandingDemo, PracticePreview } from "./landing-interactions";
import { HomeMotion } from "./home-motion";
import "./landing.css";

const DOMAINS = [
  {
    name: "Cybersécurité",
    detail: "Comprendre les attaques. Apprendre à défendre.",
    topics: "Sécurité web · CTF · Blue team",
    Icon: ShieldCheck,
  },
  {
    name: "Développement",
    detail: "Du premier programme aux applications qui fonctionnent.",
    topics: "Python · Web · Algorithmique",
    Icon: CodeXml,
  },
  {
    name: "Réseaux & systèmes",
    detail: "Savoir ce qui se passe derrière chaque connexion.",
    topics: "Linux · TCP/IP · Administration",
    Icon: Network,
  },
];

export function LandingClient({
  stats,
  featuredPaths,
}: {
  stats: LandingStats | null;
  featuredPaths: FeaturedPath[];
}): React.JSX.Element {
  return (
    <div className={`cl-home ${brandTypeface}`}>
      <HomeMotion />
      <a href="#home-content" className="skip-link">
        Aller au contenu
      </a>
      <PublicNavbar />
      <main id="home-content">
        <section className="home-hero home-wrap" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-eyebrow">L&apos;apprentissage technique, par la pratique.</p>
            <h1 id="home-title">
              <span className="home-title-line">Le savoir.</span>
              <span className="home-title-line">Le faire.</span>
              <span className="home-title-line home-title-accent">À toi de jouer.</span>
            </h1>
            <p className="home-intro">
              Cybersécurité, développement, réseaux. Apprends les concepts, mets-les à
              l&apos;épreuve et construis tes compétences. Directement dans ton navigateur.
            </p>
            <div className="home-actions">
              <Link href="/register" className="home-button home-button--primary">
                Commencer gratuitement <ArrowUpRight aria-hidden="true" size={18} />
              </Link>
              <LandingDemo />
            </div>
            <div className="home-hero-note">
              <span>En français.</span>
              <span>À ton rythme.</span>
              <span>Rien à installer.</span>
            </div>
          </div>
          <div className="home-hero-practice">
            <div className="home-preview-heading">
              <span>Un aperçu de la pratique</span>
              <span className="home-mono">HTTP / 01</span>
            </div>
            <PracticePreview />
            <div className="home-preview-foot">
              <BookOpen size={15} aria-hidden="true" />
              <span>Comprendre, essayer, puis vérifier.</span>
              <a href="#methode" aria-label="Découvrir la méthode d'apprentissage">
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="home-hero-bottom">
            <span>Un terrain pour apprendre.</span>
            <a href="#domaines">
              Trouve ton point de départ <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </section>
        <section id="domaines" className="home-domains home-wrap" aria-labelledby="domains-title">
          <div className="home-section-intro">
            <p className="home-eyebrow">Les domaines</p>
            <h2 id="domains-title">
              Trois portes d&apos;entrée.
              <br />
              Le même goût de comprendre.
            </h2>
            <p>
              Que tu partes de zéro ou que tu veuilles aller plus loin, avance dans un parcours
              structuré.
            </p>
            <Link href="/catalogue" className="home-text-link">
              Voir le catalogue <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-domain-list">
            {DOMAINS.map(({ name, detail, topics, Icon }, index) => (
              <Link href="/catalogue" className="home-domain" key={name} data-home-reveal>
                <span className="home-domain-index home-mono">0{index + 1}</span>
                <Icon size={27} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                  <span className="home-domain-topics">{topics}</span>
                </div>
                <ArrowUpRight className="home-domain-arrow" size={23} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
        <section id="methode" className="home-method" aria-labelledby="method-title">
          <div className="home-wrap home-method-inner">
            <div className="home-method-heading">
              <p className="home-eyebrow">La méthode CyberLearn</p>
              <h2 id="method-title">
                Ce que tu apprends,
                <br />
                <span>tu le mets en pratique.</span>
              </h2>
              <p>Lis une explication, essaie par toi-même et vérifie ce que tu as compris.</p>
            </div>
            <div className="home-method-body">
              <article data-home-reveal>
                <span className="home-mono">01 / Comprendre</span>
                <h3>Les concepts, à portée de main.</h3>
                <p>
                  Des leçons en français, des exemples expliqués et des quiz pour vérifier ce que tu
                  as retenu.
                </p>
              </article>
              <article data-home-reveal>
                <span className="home-mono">02 / Pratiquer</span>
                <h3>Écris ton code et vois le résultat.</h3>
                <p>
                  Écris et exécute ton code dans la leçon. Résous des exercices, explore les labs et
                  progresse en faisant.
                </p>
              </article>
              <article data-home-reveal>
                <span className="home-mono">03 / Ancrer</span>
                <h3>Une progression qui reste.</h3>
                <p>
                  Retrouve tes révisions au bon moment, suis ton niveau et tes badges, puis valide
                  ton parcours avec un examen final.
                </p>
              </article>
              <div className="home-certificate">
                <ShieldCheck size={24} strokeWidth={1.5} aria-hidden="true" />
                <p>
                  <strong>Valide tes compétences.</strong>Un certificat vérifiable en ligne après la
                  réussite de ton parcours certifiant.
                </p>
                <Link href="/verify" aria-label="Vérifier un certificat">
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section id="parcours" className="home-catalogue home-wrap" aria-labelledby="paths-title">
          <div className="home-catalogue-head">
            <div>
              <p className="home-eyebrow">Le catalogue</p>
              <h2 id="paths-title">La suite commence ici.</h2>
            </div>
            <Link href="/catalogue" className="home-text-link">
              Tous les parcours <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {featuredPaths.length > 0 ? (
            <div className="home-path-list">
              {featuredPaths.map((path, index) => (
                <Link
                  key={path.slug}
                  href={`/catalogue#${path.slug}`}
                  className="home-path"
                  data-home-reveal
                >
                  <span className="home-path-index home-mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="home-path-body">
                    <div className="home-path-labels">
                      <span>{categoryMeta(path.category).label}</span>
                      <span>{difficultyMeta(path.difficulty).label}</span>
                    </div>
                    <h3>{path.title}</h3>
                    <p>{path.description}</p>
                  </div>
                  <div className="home-path-meta">
                    <span>{path.lessons} leçons</span>
                    <span>{formatNumberFr(path.xp)} XP</span>
                  </div>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="home-catalogue-empty">
              Les parcours sont en cours de préparation. Retrouve les contenus disponibles dans le
              catalogue.
            </p>
          )}
          {stats !== null && (
            <div className="home-catalogue-counts">
              <span>
                <b>{formatNumberFr(stats.publishedLessons)}</b> leçons disponibles
              </span>
              <span>
                <b>{formatNumberFr(stats.publishedPaths)}</b> parcours à explorer
              </span>
              <span>
                Un apprentissage <b>en français</b>
              </span>
            </div>
          )}
        </section>
        <section className="home-start home-wrap" aria-labelledby="start-title">
          <div className="home-start-mark" aria-hidden="true">
            <BastionLogo size={96} />
          </div>
          <div>
            <p className="home-eyebrow">Ton premier pas</p>
            <h2 id="start-title">
              La curiosité suffit
              <br />
              pour commencer.
            </h2>
            <p>Choisis un parcours. On avance à partir de là.</p>
          </div>
          <Link href="/register" className="home-button home-button--primary">
            Créer mon compte <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <footer className="home-footer home-wrap">
        <Link href="/" className="home-wordmark" aria-label="CyberLearn, accueil">
          <BastionLogo size={27} />
          CyberLearn
        </Link>
        <nav aria-label="Liens utiles">
          <Link href="/verify">Vérifier un certificat</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/legal">Mentions légales</Link>
        </nav>
        <span>© {new Date().getFullYear()} CyberLearn</span>
      </footer>
    </div>
  );
}
