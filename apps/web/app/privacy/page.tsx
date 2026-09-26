import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

const UPDATE_DATE = "25/07/2026";
const VERSION = "1.1";
const CONTACT_EMAIL = "privacy@cyberlearn.fr";

export default function PrivacyPage(): React.JSX.Element {
  return (
    <article style={{ lineHeight: "1.7" }}>
      <h1
        style={{
          fontSize: "30px",
          fontWeight: 700,
          color: "#F5F5FA",
          marginBottom: "8px",
        }}
      >
        Politique de confidentialité
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#7F7BA9",
          fontFamily: "var(--font-mono)",
          marginBottom: "48px",
        }}
      >
        Dernière mise à jour : {UPDATE_DATE} · Version {VERSION}
      </p>

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via Cyber Learn est
          l’éditeur du site (voir{" "}
          <Link href="/legal" style={{ color: "#4D8BFF", textDecoration: "none" }}>
            mentions légales
          </Link>
          ). Cyber Learn est édité à titre non-professionnel ; aucun délégué à la protection des
          données (DPO) n’est désigné conformément à l’article 37 du RGPD.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Contact RGPD : </strong>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#4D8BFF", textDecoration: "none" }}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>
          Nous collectons uniquement les données strictement nécessaires au fonctionnement du
          service.
        </p>

        <Subsection title="2.1 Données de compte">
          <ul style={ulStyle}>
            <li>Adresse email (authentification, communication transactionnelle)</li>
            <li>Nom d’utilisateur (identifiant public)</li>
            <li>Nom d’affichage (optionnel)</li>
            <li>
              Avatar : image téléversée par vos soins, avatar généré, ou photo issue de votre compte
              OAuth GitHub
            </li>
            <li>Biographie (optionnelle, fournie volontairement par vous)</li>
          </ul>
        </Subsection>

        <Subsection title="2.2 Données d’authentification">
          <ul style={ulStyle}>
            <li>Identifiants OAuth GitHub (si vous vous connectez via GitHub)</li>
            <li>Horodatage de la dernière connexion</li>
            <li>
              Adresse IP au moment de l’authentification (pseudonymisée par fonction de hachage
              HMAC-SHA256 avant tout stockage)
            </li>
          </ul>
        </Subsection>

        <Subsection title="2.3 Données pédagogiques">
          <ul style={ulStyle}>
            <li>Progression dans les leçons et parcours</li>
            <li>Réponses aux exercices et code soumis</li>
            <li>Points d’expérience (XP), badges obtenus, niveau</li>
            <li>Certificats émis</li>
            <li>
              Notes personnelles que vous rédigez dans le bloc-notes, ainsi que vos questions et
              réponses publiées sur les leçons
            </li>
          </ul>
        </Subsection>

        <Subsection title="2.4 Données de support">
          <ul style={ulStyle}>
            <li>
              Si vous nous contactez via le formulaire de contact : votre email et le contenu de
              votre message
            </li>
            <li>Adresse IP pseudonymisée (HMAC-SHA256) pour la lutte contre l’abus</li>
          </ul>
        </Subsection>

        <Subsection title="2.5 Données techniques">
          <ul style={ulStyle}>
            <li>
              Cookies strictement nécessaires (session d’authentification, consentement, thème) et
              informations conservées dans le stockage local du navigateur (voir §8)
            </li>
            <li>
              En cas d’erreur applicative uniquement : rapport technique et enregistrement de
              session dont tous les textes et médias sont masqués avant l’envoi
            </li>
          </ul>
        </Subsection>

        <p style={{ marginTop: "16px" }}>
          <strong style={{ color: "#B8B5D1" }}>Aucune donnée sensible</strong> au sens de l’article
          9 RGPD n’est collectée.
        </p>
      </Section>

      <Section title="3. Finalités et bases légales">
        <LegalTable
          headers={["Finalité", "Base légale", "Conservation"]}
          rows={[
            [
              "Création et gestion du compte utilisateur",
              "Exécution du contrat (Art. 6.1.b RGPD)",
              "Pendant la durée d’inscription",
            ],
            [
              "Authentification et accès sécurisé au service",
              "Exécution du contrat (Art. 6.1.b)",
              "Pendant la durée d’inscription",
            ],
            [
              "Suivi pédagogique (progression, certificats)",
              "Exécution du contrat (Art. 6.1.b)",
              "Pendant la durée d’inscription",
            ],
            [
              "Lutte contre l’abus (rate limiting, anti-bot)",
              "Intérêt légitime (Art. 6.1.f)",
              "30 jours max",
            ],
            [
              "Réponse aux demandes de support",
              "Exécution mesures pré-contractuelles (Art. 6.1.b)",
              "3 mois après résolution",
            ],
            [
              "Logs de sécurité (audit, authentification)",
              "Obligation légale et intérêt légitime (Art. 6.1.c et 6.1.f)",
              "12 mois",
            ],
            ["Logs applicatifs", "Intérêt légitime (Art. 6.1.f)", "6 mois"],
          ]}
        />
      </Section>

      <Section title="4. Durées de conservation">
        <ul style={ulStyle}>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Compte actif</strong> : tant que votre compte
            existe.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Compte inactif</strong> : votre compte est
            automatiquement anonymisé après <strong style={{ color: "#B8B5D1" }}>24 mois</strong>{" "}
            sans connexion, sauf demande de suppression anticipée de votre part.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Logs d’authentification</strong> : 12 mois.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Logs d’activité applicatifs</strong> : 6 mois.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Tickets de support résolus</strong> : 3 mois après
            résolution.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Tickets de support en cours</strong> : 12 mois.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Certificats émis</strong> : conservés de manière
            permanente pour permettre leur vérification publique. En cas de suppression de compte,
            votre nom est remplacé par « Utilisateur supprimé » tout en préservant la validité
            technique du certificat.
          </li>
        </ul>
      </Section>

      <Section title="5. Destinataires et sous-traitants">
        <p style={{ marginBottom: "16px" }}>
          Vos données peuvent être traitées par les sous-traitants suivants, sous notre
          responsabilité :
        </p>
        <LegalTable
          headers={["Sous-traitant", "Rôle", "Localisation des données"]}
          rows={[
            [
              "Supabase",
              "Base de données, authentification, stockage",
              "Francfort, Allemagne (eu-central-1)",
            ],
            [
              "Vercel",
              "Hébergement du site et trafic HTTP",
              "États-Unis (CDN) - les données utilisateur ne transitent pas par leurs serveurs de stockage",
            ],
            [
              "Resend",
              "Envoi d’emails transactionnels",
              "États-Unis (DPF + clauses contractuelles types)",
            ],
            ["Upstash", "Cache Redis (rate limiting, sessions volatiles)", "Europe"],
            [
              "Sentry",
              "Détection des erreurs techniques (rapport d’erreur et enregistrement de session masqué, uniquement lorsqu’une erreur survient)",
              "États-Unis (DPF + clauses contractuelles types)",
            ],
            [
              "Atlassian (Jira)",
              "Suivi interne des tickets de support",
              "États-Unis (DPF + clauses contractuelles types)",
            ],
          ]}
        />
        <p style={{ marginTop: "16px" }}>
          Vos données ne sont <strong style={{ color: "#B8B5D1" }}>jamais vendues</strong> ni cédées
          à des tiers à des fins commerciales.
        </p>
      </Section>

      <Section title="6. Transferts hors UE">
        <p>
          Certains sous-traitants (Vercel, Resend, Atlassian, Sentry) sont basés aux États-Unis. Les
          transferts sont encadrés par :
        </p>
        <ul style={{ ...ulStyle, marginTop: "12px" }}>
          <li>Le Data Privacy Framework (DPF) auquel ces sociétés adhèrent, ou</li>
          <li>Les Clauses Contractuelles Types (CCT) approuvées par la Commission européenne.</li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Vos <strong style={{ color: "#B8B5D1" }}>données utilisateur principales</strong> (compte,
          progression, certificats) sont stockées{" "}
          <strong style={{ color: "#B8B5D1" }}>uniquement dans l’Union européenne</strong> (Supabase
          Francfort).
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
        <ul style={{ ...ulStyle, marginTop: "12px" }}>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit d’accès (Art. 15)</strong> : obtenir une
            copie de vos données.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit de rectification (Art. 16)</strong> :
            corriger des données inexactes.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit à l’effacement (Art. 17)</strong> : supprimer
            vos données (« droit à l’oubli »).
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit à la limitation (Art. 18)</strong> : limiter
            le traitement de vos données.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit à la portabilité (Art. 20)</strong> :
            récupérer vos données dans un format structuré.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit d’opposition (Art. 21)</strong> : vous
            opposer à un traitement basé sur l’intérêt légitime.
          </li>
          <li>
            <strong style={{ color: "#B8B5D1" }}>Droit de retrait du consentement</strong> : à tout
            moment, lorsque le traitement repose sur votre consentement.
          </li>
        </ul>

        <Subsection title="Modalités d’exercice">
          <p>Vous pouvez exercer vos droits en :</p>
          <ul style={{ ...ulStyle, marginTop: "8px" }}>
            <li>
              Modifiant vos données directement depuis votre espace personnel (informations de
              profil),
            </li>
            <li>
              Téléchargeant l’export de vos données depuis votre espace personnel{" "}
              <a href="/settings/data" style={{ color: "#4D8BFF", textDecoration: "none" }}>
                /settings/data
              </a>
              ,
            </li>
            <li>
              Demandant la suppression de votre compte depuis la section{" "}
              <Link href="/settings/data" style={{ color: "#4D8BFF", textDecoration: "none" }}>
                Mes données
              </Link>
              . La suppression est définitive et prend effet immédiatement après confirmation par
              email (Art. 17 RGPD),
            </li>
            <li>
              Adressant un email à{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: "#4D8BFF", textDecoration: "none" }}
              >
                {CONTACT_EMAIL}
              </a>{" "}
              depuis l’adresse associée à votre compte.
            </li>
          </ul>
          <p style={{ marginTop: "12px" }}>
            Nous répondons dans un délai maximum d’
            <strong style={{ color: "#B8B5D1" }}>un mois</strong> conformément à l’article 12 RGPD.
          </p>
        </Subsection>

        <Subsection title="Droit de réclamation">
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
            réclamation auprès de la{" "}
            <strong style={{ color: "#B8B5D1" }}>
              Commission Nationale de l’Informatique et des Libertés (CNIL)
            </strong>{" "}
            :
          </p>
          <ul style={{ ...ulStyle, marginTop: "8px" }}>
            <li>
              En ligne :{" "}
              <a
                href="https://www.cnil.fr/fr/plaintes"
                style={{ color: "#4D8BFF", textDecoration: "none" }}
                target="_blank"
                rel="noopener noreferrer"
              >
                cnil.fr/fr/plaintes
              </a>
            </li>
            <li>Par courrier : 3 Place de Fontenoy, TSA 80715, 75334 Paris cedex 07</li>
          </ul>
        </Subsection>
      </Section>

      <Section title="8. Cookies et stockage local" id="cookies">
        <p style={{ marginBottom: "16px" }}>
          Cyber Learn utilise uniquement des{" "}
          <strong style={{ color: "#B8B5D1" }}>cookies strictement nécessaires</strong> au
          fonctionnement du service :
        </p>
        <LegalTable
          headers={["Cookie", "Finalité", "Durée"]}
          rows={[
            ["sb-*-auth-token", "Session d’authentification Supabase", "Jusqu’à déconnexion"],
            [
              "cl_consent",
              "Mémorisation de la prise de connaissance des conditions d’utilisation",
              "365 jours",
            ],
            [
              "Cookies de préférence (thème, sidebar)",
              "Personnalisation de l’interface",
              "Variable, défini par l’utilisateur",
            ],
          ]}
        />
        <p style={{ marginTop: "24px", marginBottom: "16px" }}>
          Le service inscrit également des informations dans le stockage local de votre navigateur (
          <code style={codeStyle}>localStorage</code> et{" "}
          <code style={codeStyle}>sessionStorage</code>). Ces informations ne sont jamais transmises
          à un serveur, à l’exception de l’identifiant technique de diagnostic décrit ci-dessous :
        </p>
        <LegalTable
          headers={["Entrée", "Finalité", "Durée"]}
          rows={[
            [
              "cl-welcome-seen",
              "Ne rejouer qu’une fois la vidéo de bienvenue",
              "Jusqu’à effacement",
            ],
            [
              "cl-changelog-seen",
              "Signaler les notes de version non encore consultées",
              "Jusqu’à effacement",
            ],
            ["cl-splash-shown", "Ne pas rejouer l’animation d’accueil", "Fermeture de l’onglet"],
            [
              "sentryReplaySession",
              "Identifiant technique associant les événements d’une même session à un rapport d’erreur",
              "Fermeture de l’onglet",
            ],
          ]}
        />
        <p style={{ marginTop: "16px" }}>
          <strong style={{ color: "#B8B5D1" }}>
            Aucun cookie ni traceur publicitaire, analytique ou de tracking comportemental n’est
            utilisé.
          </strong>{" "}
          Conformément à l’article 82 de la loi Informatique et Libertés, ces traceurs strictement
          nécessaires au fonctionnement et à la sécurité du service sont exemptés de consentement.
        </p>
      </Section>

      <Section title="9. Sécurité">
        <p>Les données sont protégées par :</p>
        <ul style={{ ...ulStyle, marginTop: "12px" }}>
          <li>Chiffrement TLS 1.3 pour toutes les communications,</li>
          <li>Authentification via OAuth et tokens JWT à durée limitée,</li>
          <li>Politique de sécurité du contenu (CSP) restrictive,</li>
          <li>Pseudonymisation des adresses IP (HMAC-SHA256) avant tout stockage,</li>
          <li>Limitation du taux de requêtes (rate limiting),</li>
          <li>Audits de sécurité réguliers du code source.</li>
        </ul>
      </Section>

      <Section title="10. Modification de cette politique">
        <p>
          Cette politique peut être mise à jour pour refléter des évolutions techniques, juridiques
          ou organisationnelles. La date de dernière mise à jour est indiquée en début de document.
          Les modifications substantielles vous seront notifiées par email ou via une notification
          dans l’application.
        </p>
      </Section>
    </article>
  );
}

const ulStyle: React.CSSProperties = {
  paddingLeft: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  color: "#F5F5FA",
};

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}): React.JSX.Element {
  return (
    <section id={id} style={{ marginBottom: "40px" }}>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#F5F5FA",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #1F1B47",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: "14px", color: "#B8B5D1" }}>{children}</div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div style={{ marginTop: "20px" }}>
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#F5F5FA",
          marginBottom: "10px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}): React.JSX.Element {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          color: "#B8B5D1",
        }}
      >
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  background: "#0A0826",
                  border: "1px solid #1F1B47",
                  color: "#F5F5FA",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(10,8,38,0.4)" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #1F1B47",
                    verticalAlign: "top",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
