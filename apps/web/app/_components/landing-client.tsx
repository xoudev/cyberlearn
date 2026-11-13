import type React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { FeaturedPath, LandingStats } from "@cyberlearn/db";
import { formatNumberFr } from "@cyberlearn/lib";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { BASTION_MARK_PATHS, BastionLogo } from "@/components/bastion-logo";
import { brandTypeface } from "@/components/brand-typeface";
import { CatalogueArtwork } from "@/components/catalogue-artwork";
import { PublicNavbar } from "./public-navbar";
import { LandingDemo, Playground } from "./landing-interactions";
import { HomeMotion } from "./home-motion";
import "@/components/learning-catalogue.css";
import "./landing.css";

export interface HomePath extends FeaturedPath {
  /** Null when the catalogue read did not return the path. */
  refCode: string | null;
  hasCertificate: boolean;
  coverSrc: string;
}

export type DomainCounts = Record<FeaturedPath["category"], number>;

const DOMAINS: {
  category: FeaturedPath["category"];
  name: string;
  detail: string;
  topics: string;
}[] = [
  {
    category: "CYBERSEC",
    name: "Cybersécurité",
    detail: "Comprendre une attaque, puis apprendre à la bloquer.",
    topics: "Sécurité web · CTF · Blue team",
  },
  {
    category: "DEV",
    name: "Développement",
    detail: "Du premier script aux applications qui tournent.",
    topics: "Python · Web · Algorithmique",
  },
  {
    category: "NETWORK",
    name: "Réseaux",
    detail: "Savoir ce qui se passe derrière chaque connexion, systèmes compris.",
    topics: "Linux · TCP/IP · Administration",
  },
];

// Each entry is a lesson component of app/(app)/lessons/[slug]/_components.
const WORKSHOPS = [
  {
    name: "Terminal Linux",
    detail:
      "Un vrai Linux démarre dans l'onglet. Chaque commande fait ce qu'elle ferait sur une machine.",
  },
  {
    name: "Éditeur Python",
    detail: "Ton code s'exécute dans le navigateur, et sa sortie s'affiche sous l'éditeur.",
  },
  {
    name: "Base SQL",
    detail: "Une base SQLite à interroger, avec le résultat de chaque requête.",
  },
  {
    name: "Labo réseau",
    detail: "Câble des PC, des switchs et des routeurs, adresse-les, puis teste au ping.",
  },
  {
    name: "Dissecteur de paquets",
    detail: "Clique un octet d'une trame : il te dit à quel champ il appartient.",
  },
  {
    name: "Chasse dans les logs",
    detail: "Filtre et compte les événements jusqu'à faire ressortir l'attaque.",
  },
  {
    name: "E-mail de phishing",
    detail: "Signale ce qui trahit le message : l'expéditeur, le lien, la pièce jointe.",
  },
  {
    name: "OSINT sur photo",
    detail: "Lis les métadonnées d'une photo et retrouve où elle a été prise.",
  },
  {
    name: "Bac à sable Git",
    detail: "Tape tes commandes et regarde le graphe des branches se dessiner.",
  },
  {
    name: "Atelier JWT",
    detail: "Démonte un jeton, puis forge-le contre des services mal configurés.",
  },
  {
    name: "Pare-feu",
    detail: "Écris les règles et regarde quels paquets passent.",
  },
  {
    name: "Établi de chiffrement",
    detail: "Base64, César, Vigenère, XOR, SHA-256 : transforme un texte, déchiffre un message.",
  },
];

const ROUTE = [
  {
    verb: "Lire",
    title: "Une explication courte.",
    detail:
      "Des leçons en français, des exemples commentés et un glossaire qui s'ouvre sur les termes techniques.",
  },
  {
    verb: "Pratiquer",
    title: "L'atelier au milieu du texte.",
    detail: "Terminal, éditeur ou labo : tu essaies dans la page, juste sous l'explication.",
  },
  {
    verb: "Vérifier",
    title: "Un quiz qui explique.",
    detail:
      "Chaque réponse est corrigée avec son explication. La leçon validée crédite ses XP et peut débloquer un badge.",
  },
  {
    verb: "Retenir",
    title: "Le rappel du jour.",
    detail:
      "Les questions ratées reviennent le lendemain. Chaque bonne réponse espace le rappel suivant.",
  },
];

// The Leitner boxes of @cyberlearn/lib/revisions/cards, in days.
const RECALL_DAYS = [1, 3, 7, 21];

const PROGRESS_FACTS = [
  {
    term: "100 niveaux",
    detail: "Les leçons, les défis et les rappels du jour rapportent de l'XP.",
  },
  {
    term: "Une série",
    detail:
      "Un jour d'activité la prolonge. Les quêtes de la semaine font gagner des gels de série.",
  },
  {
    term: "Des duels",
    detail: "Défie un ami sur les questions d'un parcours.",
  },
  {
    term: "Des ligues",
    detail: "À la fin de chaque saison, les promotions et les relégations.",
  },
];

// Twelve of the badges of packages/db/prisma/seed.ts, with their own icons.
const BADGES = [
  { icon: "first-step", name: "Premier pas", how: "Termine ta première leçon.", rarity: "Commun" },
  { icon: "first-flag", name: "Premier flag", how: "Résous ton premier défi.", rarity: "Commun" },
  { icon: "first-duel", name: "Premier duel", how: "Va au bout d'un duel.", rarity: "Commun" },
  { icon: "recall-7", name: "Mémoire vive", how: "Fais 7 rappels du jour.", rarity: "Commun" },
  {
    icon: "explorer",
    name: "Explorateur",
    how: "Termine une leçon dans chaque domaine.",
    rarity: "Rare",
  },
  { icon: "streak-7", name: "Sérieux", how: "Tiens une série de 7 jours.", rarity: "Rare" },
  {
    icon: "no-hints",
    name: "Sans filet",
    how: "Résous un défi sans révéler d'indice.",
    rarity: "Rare",
  },
  { icon: "perfect-quiz", name: "Quiz parfait", how: "Obtiens 100 % à un quiz.", rarity: "Épique" },
  { icon: "architect", name: "Architecte", how: "Termine un parcours entier.", rarity: "Épique" },
  {
    icon: "podium",
    name: "Podium",
    how: "Finis un tournoi dans les trois premières équipes.",
    rarity: "Épique",
  },
  {
    icon: "certified",
    name: "Certifié",
    how: "Obtiens ton premier certificat.",
    rarity: "Légendaire",
  },
  { icon: "legend", name: "Légende", how: "Atteins le niveau 50.", rarity: "Légendaire" },
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The Bastion mark as four separate parts, so the closing section can assemble it. */
function BastionParts({ className }: { className: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path data-part="top" pathLength={1} d={BASTION_MARK_PATHS.top} />
      <path data-part="left" pathLength={1} d={BASTION_MARK_PATHS.left} />
      <path data-part="right" pathLength={1} d={BASTION_MARK_PATHS.right} />
      <path data-part="core" pathLength={1} d={BASTION_MARK_PATHS.core} />
    </svg>
  );
}

export function LandingClient({
  stats,
  featuredPaths,
  domainCounts,
}: {
  stats: LandingStats | null;
  featuredPaths: HomePath[];
  domainCounts: DomainCounts | null;
}): React.JSX.Element {
  return (
    <div className={`cl-home ${brandTypeface}`}>
      <HomeMotion />
      <a href="#home-content" className="skip-link">
        Aller au contenu
      </a>
      <div className="home-progress" aria-hidden="true" />
      <PublicNavbar />
      <main id="home-content">
        <section className="home-hero" aria-labelledby="home-title">
          <BastionParts className="home-hero-mark" />
          <div className="home-wrap">
            <h1 id="home-title">
              <span className="home-title-line">Ici, tu apprends</span>{" "}
              <span className="home-title-line home-title-accent">les mains dans le code.</span>
            </h1>
            <div className="home-hero-body">
              <div className="home-hero-copy">
                <p className="home-intro">
                  Cybersécurité, développement, réseaux. Les leçons te font écrire du code, lire une
                  requête ou chercher une faille, directement dans ton navigateur. En français, sans
                  rien installer.
                </p>
                <div className="home-actions">
                  <Link href="/register" className="home-button home-button--primary">
                    Créer mon compte gratuit <ArrowUpRight aria-hidden="true" size={18} />
                  </Link>
                  <LandingDemo />
                </div>
                <p className="home-hero-hint">
                  Pas encore décidé ?{" "}
                  <a href="#essai">
                    Fais d&apos;abord les trois exercices du banc d&apos;essai
                    <ArrowDown size={15} aria-hidden="true" />
                  </a>
                </p>
              </div>
              <Playground />
            </div>
          </div>
        </section>

        <section id="domaines" className="home-domains" aria-labelledby="domains-title">
          <div className="home-wrap">
            <header className="home-head">
              <h2 id="domains-title">Trois domaines, un seul compte.</h2>
              <p>
                Commence par celui qui t&apos;attire. Ils se rejoignent vite : une faille web,
                c&apos;est du code et du réseau.
              </p>
            </header>
            <ul className="home-domain-list">
              {DOMAINS.map(({ category, name, detail, topics }, index) => {
                const count = domainCounts?.[category] ?? 0;
                return (
                  <li key={category} data-home-reveal>
                    <Link href="/catalogue" className="home-domain">
                      <span className="home-domain-index home-mono" aria-hidden="true">
                        {pad(index + 1)}
                      </span>
                      <span className="home-domain-name">{name}</span>
                      <span className="home-domain-detail">
                        <span>{detail}</span>
                        <span className="home-domain-topics">{topics}</span>
                      </span>
                      <span className="home-domain-count home-mono">
                        {count > 0 && `${String(count)} parcours`}
                      </span>
                      <ArrowUpRight className="home-domain-arrow" size={30} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section id="ateliers" className="home-workshops" aria-labelledby="workshops-title">
          <div className="home-wrap home-workshops-inner">
            <header className="home-head home-head--sticky">
              <h2 id="workshops-title">Des ateliers dans la page.</h2>
              <p>
                Pas de machine virtuelle à préparer : l&apos;atelier s&apos;ouvre au milieu de la
                leçon et tourne dans ton navigateur.
              </p>
              <Link href="/catalogue" className="home-text-link">
                Voir le catalogue <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </header>
            <ol className="home-workshop-list" data-home-reveal="stagger">
              {WORKSHOPS.map(({ name, detail }, index) => (
                <li key={name} className="home-workshop">
                  <span className="home-mono" aria-hidden="true">
                    {pad(index + 1)}
                  </span>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="methode" className="home-route" aria-labelledby="route-title">
          <div className="home-wrap">
            <header className="home-head">
              <h2 id="route-title">Ce que tu apprends, tu le gardes.</h2>
              <p>
                Chaque leçon suit le même trajet, de la lecture au rappel trois semaines plus tard.
              </p>
            </header>
            <div className="home-route-track" data-home-route>
              <span className="home-route-rail" aria-hidden="true" />
              <ol className="home-route-steps">
                {ROUTE.map(({ verb, title, detail }, index) => (
                  <li key={verb} className="home-route-step" data-home-step>
                    <span className="home-route-number" aria-hidden="true">
                      {pad(index + 1)}
                    </span>
                    <span className="home-route-mark" aria-hidden="true" />
                    <div className="home-route-card">
                      <p className="home-route-verb">{verb}</p>
                      <h3>{title}</h3>
                      <p>{detail}</p>
                      {index === ROUTE.length - 1 && (
                        <ol className="home-recall" aria-label="Intervalles entre deux rappels">
                          {RECALL_DAYS.map((days) => (
                            <li key={days}>
                              <span className="home-recall-stop">
                                <span className="home-recall-box" aria-hidden="true" />
                                <span className="home-mono" aria-hidden="true">
                                  J+{days}
                                </span>
                                <span className="sr-only">
                                  {days} {days > 1 ? "jours" : "jour"}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="progression" className="home-progression" aria-labelledby="progression-title">
          <div className="home-wrap home-progression-inner">
            <div className="home-progression-copy">
              <header className="home-head">
                <h2 id="progression-title">Ta progression se voit.</h2>
                <p>
                  Ce que tu termines s&apos;ajoute à ton profil, et tu peux le mesurer aux autres.
                </p>
              </header>
              <dl className="home-facts" data-home-reveal="stagger">
                {PROGRESS_FACTS.map(({ term, detail }) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ul
              className="home-badges"
              data-home-reveal="stagger"
              aria-label="Quelques badges à obtenir"
            >
              {BADGES.map(({ icon, name, how, rarity }) => (
                <li key={icon} className="home-badge">
                  {/* A static SVG of the site: next/image would add nothing to it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/badges/${icon}.svg`} alt="" width={64} height={64} loading="lazy" />
                  <h3>{name}</h3>
                  <p>{how}</p>
                  <span className="home-mono">{rarity}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="parcours" className="home-catalogue" aria-labelledby="paths-title">
          <div className="home-wrap">
            <div className="home-catalogue-head">
              <header className="home-head">
                <h2 id="paths-title">Choisis ton premier parcours.</h2>
              </header>
              <Link href="/catalogue" className="home-text-link">
                Tous les parcours <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            {featuredPaths.length > 0 ? (
              <div className="home-path-list">
                {featuredPaths.map((path) => (
                  <Link
                    key={path.slug}
                    href={`/catalogue#${path.slug}`}
                    className="home-path"
                    data-home-reveal
                  >
                    <CatalogueArtwork
                      category={path.category}
                      reference={path.refCode ?? ""}
                      coverSrc={path.coverSrc}
                    />
                    <div className="home-path-body">
                      <div className="home-path-labels">
                        <span>{categoryMeta(path.category).label}</span>
                        <span>{difficultyMeta(path.difficulty).label}</span>
                        {path.hasCertificate && <span>Certifiant</span>}
                      </div>
                      <h3>{path.title}</h3>
                      <p>{path.description}</p>
                      <div className="home-path-meta home-mono">
                        <span>{path.lessons} leçons</span>
                        <span>{formatNumberFr(path.xp)} XP</span>
                        <ArrowUpRight size={22} aria-hidden="true" />
                      </div>
                    </div>
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
              <dl className="home-catalogue-counts" data-home-reveal>
                <div>
                  <dt>leçons au catalogue</dt>
                  <dd>{formatNumberFr(stats.publishedLessons)}</dd>
                </div>
                <div>
                  <dt>parcours à suivre</dt>
                  <dd>{formatNumberFr(stats.publishedPaths)}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <section className="home-proof" aria-label="Certificat et classes">
          <div className="home-wrap home-proof-inner">
            <article className="home-certificate" data-home-reveal>
              <BastionLogo size={56} />
              <h2>Un certificat que tout le monde peut vérifier.</h2>
              <p>
                Réussis l&apos;examen final d&apos;un parcours certifiant : ton certificat PDF porte
                un numéro et une empreinte SHA-256. Un recruteur les contrôle en ligne, sans compte.
              </p>
              <p className="home-certificate-format">
                <span>Format du numéro</span>
                <span className="home-mono">CL-AAAA-XXXXXXXX</span>
              </p>
              <Link href="/verify" className="home-button home-button--ink">
                Vérifier un certificat
              </Link>
            </article>
            <article className="home-teachers" data-home-reveal>
              <h2>Tu enseignes ?</h2>
              <p>
                Écris tes propres leçons, compose un parcours pour ta classe, donne un travail avec
                une échéance et suis l&apos;avancement de chaque élève, export CSV compris.
              </p>
              <Link href="/contact?theme=ESTABLISHMENT_REQUEST" className="home-text-link">
                Ajouter mon établissement <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section className="home-start" aria-labelledby="start-title" data-home-reveal>
          <div className="home-wrap home-start-inner">
            <BastionParts className="home-start-mark" />
            <div>
              <h2 id="start-title">La curiosité suffit pour commencer.</h2>
              <p>
                Crée ton compte, passe le test de positionnement si tu veux sauter les bases, puis
                ouvre ta première leçon.
              </p>
            </div>
            <div className="home-start-actions">
              <Link href="/register" className="home-button home-button--ink">
                Créer mon compte <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/catalogue" className="home-start-link">
                Voir le catalogue d&apos;abord
              </Link>
            </div>
          </div>
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
