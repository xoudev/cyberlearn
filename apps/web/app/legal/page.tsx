import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
};

const UPDATE_DATE = "23/05/2026";
const CONTACT_EMAIL = "privacy@cyberlearn.fr";

export default function LegalPage(): React.JSX.Element {
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
        Mentions légales
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#7F7BA9",
          fontFamily: "var(--font-mono)",
          marginBottom: "48px",
        }}
      >
        Dernière mise à jour : {UPDATE_DATE}
      </p>

      <Section title="1. Éditeur du site">
        <p>
          Conformément à l’article 6 III 2° de la loi n° 2004-575 du 21 juin 2004 pour la confiance
          dans l’économie numérique (LCEN), le site Cyber Learn est édité à titre{" "}
          <strong style={{ color: "#B8B5D1" }}>non professionnel</strong> par une personne physique.
        </p>
        <p style={{ marginTop: "12px" }}>
          L’identité complète de l’éditeur est communiquée à l’hébergeur du site (voir section 2) et
          tenue à la disposition des autorités judiciaires dans les conditions prévues par la loi.
        </p>
        <p style={{ marginTop: "12px" }}>
          Pour toute demande relative à ce site, vous pouvez nous contacter à l’adresse :
        </p>
        <p style={{ marginTop: "12px" }}>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{ color: "#4D8BFF", textDecoration: "none", fontWeight: 600 }}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      <Section title="2. Hébergeur">
        <p>Le site est hébergé par :</p>
        <p
          style={{
            marginTop: "16px",
            padding: "16px 20px",
            background: "#0A0826",
            border: "1px solid #1F1B47",
            borderLeft: "3px solid #1F1B47",
            fontSize: "14px",
            color: "#B8B5D1",
            lineHeight: "1.8",
          }}
        >
          <strong style={{ color: "#F5F5FA" }}>Vercel Inc.</strong>
          <br />
          440 N Barranca Ave #4133
          <br />
          Covina, CA 91723
          <br />
          États-Unis
          <br />
          <a
            href="https://vercel.com"
            style={{ color: "#4D8BFF", textDecoration: "none" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            vercel.com
          </a>
        </p>
      </Section>

      <Section title="3. Directeur de la publication">
        <p>
          Le directeur de la publication, au sens de la loi du 29 juillet 1881, est l’éditeur du
          site, dont l’identité est communiquée à l’hébergeur conformément à l’article 6 III 2°
          LCEN.
        </p>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          L’ensemble des contenus pédagogiques publiés sur Cyber Learn (leçons, parcours, exercices,
          certificats) sont la propriété de l’éditeur. Toute reproduction, représentation,
          modification ou exploitation, totale ou partielle, sans autorisation préalable écrite, est
          interdite et constitue une contrefaçon sanctionnée par les articles L. 335-2 et suivants
          du Code de la propriété intellectuelle.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les contenus produits par les utilisateurs (réponses aux exercices, commentaires) restent
          la propriété de leur auteur. L’éditeur dispose d’une licence non-exclusive d’utilisation
          aux fins du fonctionnement de la plateforme.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les marques, logos et signes distinctifs reproduits sur le site sont la propriété de leurs
          détenteurs respectifs.
        </p>
      </Section>

      <Section title="5. Loi applicable">
        <p>
          Le présent site et ses conditions d’utilisation sont régis par le droit français. Tout
          litige relatif au site relève de la compétence des juridictions françaises.
        </p>
        <p style={{ marginTop: "16px" }}>
          Pour en savoir plus sur la gestion de vos données personnelles, consultez notre{" "}
          <Link href="/privacy" style={{ color: "#4D8BFF", textDecoration: "none" }}>
            Politique de confidentialité
          </Link>
          .
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
