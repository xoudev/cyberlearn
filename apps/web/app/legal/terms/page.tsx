import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d’Utilisation",
};

const EFFECTIVE_DATE = "1er janvier 2025";
const COMPANY = "Cyber Learn";
const EMAIL = "legal@cyberlearn.fr";

export default function TermsPage(): React.JSX.Element {
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
        Conditions Générales d’Utilisation
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#7F7BA9",
          fontFamily: "var(--font-mono)",
          marginBottom: "48px",
        }}
      >
        Dernière mise à jour : {EFFECTIVE_DATE}
      </p>

      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») régissent l’accès et
          l’utilisation de la plateforme {COMPANY}, accessible à l’adresse{" "}
          <strong style={{ color: "#B8B5D1" }}>cyberlearn.fr</strong>, éditée par {COMPANY}{" "}
          (ci-après « nous », « notre » ou « la Plateforme »).
        </p>
        <p style={{ marginTop: "12px" }}>
          En accédant à la Plateforme ou en créant un compte, vous acceptez sans réserve les
          présentes CGU. Si vous n’en acceptez pas les termes, veuillez ne pas utiliser la
          Plateforme.
        </p>
      </Section>

      <Section title="2. Accès au service">
        <p>
          L’accès à la Plateforme est réservé aux personnes physiques âgées d’au moins 16 ans. Les
          mineurs de moins de 16 ans doivent obtenir le consentement de leur représentant légal.
        </p>
        <p style={{ marginTop: "12px" }}>
          L’inscription s’effectue via une adresse e-mail et un mot de passe. La connexion peut
          également utiliser un compte GitHub (OAuth). Vous êtes responsable de la confidentialité
          de vos identifiants et de toute activité effectuée depuis votre compte.
        </p>
        <p style={{ marginTop: "12px" }}>
          Nous nous réservons le droit de suspendre ou de résilier tout compte en cas de violation
          des présentes CGU, d’utilisation abusive ou de comportement nuisant à la communauté.
        </p>
      </Section>

      <Section title="3. Utilisation acceptable">
        <p>Il est strictement interdit de :</p>
        <ul
          style={{
            marginTop: "12px",
            paddingLeft: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <li>
            utiliser la Plateforme à des fins illicites ou contraires aux lois et règlements en
            vigueur ;
          </li>
          <li>
            reproduire, copier, revendre ou exploiter commercialement tout contenu sans autorisation
            écrite préalable ;
          </li>
          <li>
            tenter de contourner les mesures de sécurité de la Plateforme ou d’accéder à des données
            qui ne vous sont pas destinées ;
          </li>
          <li>
            transmettre des contenus illicites, diffamatoires, obscènes ou portant atteinte aux
            droits de tiers ;
          </li>
          <li>
            utiliser des robots, scrapers ou tout autre outil automatisé pour collecter des données
            de la Plateforme.
          </li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Les environnements sandbox et terminaux simulés fournis par la Plateforme sont réservés à
          un usage pédagogique. Toute tentative d’exploitation à des fins malveillantes est
          strictement interdite.
        </p>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          L’ensemble des contenus de la Plateforme (textes, illustrations, vidéos, code source,
          exercices, badges, certificats) est la propriété exclusive de {COMPANY} ou de ses
          concédants de licence, et est protégé par le droit d’auteur.
        </p>
        <p style={{ marginTop: "12px" }}>
          Toute reproduction, distribution ou modification sans autorisation préalable et écrite est
          interdite. Une licence d’utilisation personnelle et non commerciale vous est accordée pour
          accéder aux contenus dans le cadre de votre formation sur la Plateforme.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les certificats générés par la Plateforme vous sont délivrés à titre personnel. Ils
          peuvent être partagés à des fins de preuve de formation, mais ne peuvent être modifiés ou
          falsifiés.
        </p>
      </Section>

      <Section title="5. Données personnelles (RGPD)">
        <p>
          {COMPANY} collecte et traite vos données personnelles conformément au Règlement Général
          sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et
          Libertés.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Données collectées :</strong> adresse e-mail, nom
          d’utilisateur (optionnel), avatar (optionnel), données de progression pédagogique (leçons
          complétées, scores, XP, badges).
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Finalités :</strong> gestion de votre compte, suivi
          de votre progression, émission de certificats, envoi de notifications (si activé),
          amélioration du service.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Durée de conservation :</strong> données de compte
          conservées jusqu’à suppression du compte ou 24 mois d’inactivité. Journaux d’audit
          conservés 12 mois.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Vos droits :</strong> vous disposez d’un droit
          d’accès, de rectification, de suppression, de portabilité et d’opposition. Pour exercer
          ces droits, contactez-nous à{" "}
          <a href={`mailto:${EMAIL}`} style={{ color: "#4D8BFF", textDecoration: "none" }}>
            {EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          La Plateforme utilise des cookies strictement nécessaires au fonctionnement du service
          (authentification, préférences d’interface). Aucun cookie publicitaire ou de tracking
          tiers n’est utilisé.
        </p>
        <p style={{ marginTop: "12px" }}>
          Un cookie de notice (
          <code style={{ color: "#0AFFD4", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            cl_consent
          </code>
          ) est stocké localement pour mémoriser que vous avez pris connaissance des informations
          relatives aux cookies. Il expire après 365 jours.
        </p>
      </Section>

      <Section title="7. Limitation de responsabilité">
        <p>
          La Plateforme est fournie « en l’état ». Nous ne garantissons pas l’absence
          d’interruptions, d’erreurs ou de pertes de données. Nous déclinons toute responsabilité
          pour les dommages directs ou indirects résultant de l’utilisation ou de l’impossibilité
          d’utiliser la Plateforme.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les contenus pédagogiques relatifs à la cybersécurité sont fournis à titre éducatif
          uniquement. Toute utilisation des techniques enseignées à des fins malveillantes est sous
          l’entière responsabilité de l’utilisateur.
        </p>
      </Section>

      <Section title="8. Modification des CGU">
        <p>
          Nous nous réservons le droit de modifier les présentes CGU à tout moment. En cas de
          modification substantielle, vous en serez informé par notification in-app ou par e-mail.
          La poursuite de l’utilisation de la Plateforme après notification vaut acceptation des
          nouvelles CGU.
        </p>
      </Section>

      <Section title="9. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont régies par le droit français. En cas de litige, les parties
          s’engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut
          d’accord amiable, les tribunaux compétents du ressort du siège social de {COMPANY} seront
          seuls compétents.
        </p>
        <p style={{ marginTop: "12px" }}>
          Pour toute question relative aux présentes CGU, contactez-nous :{" "}
          <a href={`mailto:${EMAIL}`} style={{ color: "#4D8BFF", textDecoration: "none" }}>
            {EMAIL}
          </a>
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section style={{ marginBottom: "40px" }}>
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
