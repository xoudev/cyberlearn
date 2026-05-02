import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
};

const EFFECTIVE_DATE = "1er janvier 2025";
const COMPANY = "Cyber Learn";
const EMAIL = "legal@cyberlearn.app";

export default function CgvPage(): React.JSX.Element {
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
        Conditions Générales de Vente
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#6B6890",
          fontFamily: "var(--font-mono)",
          marginBottom: "48px",
        }}
      >
        Dernière mise à jour : {EFFECTIVE_DATE}
      </p>

      <Section title="1. Champ d’application">
        <p>
          Les présentes Conditions Générales de Vente (ci-après « CGV ») s’appliquent à toute
          souscription à un abonnement payant sur la plateforme {COMPANY} (ci-après « la Plateforme
          »). Elles complètent les Conditions Générales d’Utilisation (CGU).
        </p>
        <p style={{ marginTop: "12px" }}>
          En finalisant votre commande, vous acceptez sans réserve les présentes CGV.
        </p>
      </Section>

      <Section title="2. Offres et tarifs">
        <p>
          La Plateforme propose un accès gratuit à un catalogue de contenus limité, ainsi que des
          abonnements payants donnant accès à l’ensemble des contenus, fonctionnalités avancées et
          certification.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les prix affichés sont en euros (€) toutes taxes comprises (TTC). {COMPANY} se réserve le
          droit de modifier ses tarifs à tout moment. Les modifications n’affectent pas les
          abonnements en cours jusqu’à leur date de renouvellement.
        </p>
        <p style={{ marginTop: "12px" }}>
          Les tarifs en vigueur sont ceux affichés sur la Plateforme au moment de la commande.
        </p>
      </Section>

      <Section title="3. Commande et paiement">
        <p>
          La souscription s’effectue en ligne via le formulaire de commande de la Plateforme. La
          commande est confirmée après réception du paiement.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Moyens de paiement acceptés :</strong> carte bancaire
          (Visa, Mastercard, American Express) et tout autre moyen proposé lors du paiement.
        </p>
        <p style={{ marginTop: "12px" }}>
          Le paiement est sécurisé. Les données bancaires ne transitent pas par nos serveurs et sont
          traitées directement par notre prestataire de paiement certifié PCI-DSS.
        </p>
        <p style={{ marginTop: "12px" }}>
          En cas d’abonnement avec renouvellement automatique, vous serez informé avant chaque
          renouvellement. Vous pouvez annuler le renouvellement automatique depuis votre espace
          personnel.
        </p>
      </Section>

      <Section title="4. Droit de rétractation">
        <p>
          Conformément à l’article L.221-18 du Code de la consommation, vous disposez d’un délai de{" "}
          <strong style={{ color: "#B8B5D1" }}>14 jours calendaires</strong> à compter de la
          souscription pour exercer votre droit de rétractation, sans avoir à motiver votre
          décision.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong style={{ color: "#B8B5D1" }}>Exception :</strong> conformément à l’article
          L.221-28 du Code de la consommation, si vous avez expressément demandé l’exécution
          immédiate de la prestation et avez renoncé à votre droit de rétractation lors de la
          commande, ce droit ne peut plus être exercé dès lors que le service a été pleinement
          exécuté.
        </p>
        <p style={{ marginTop: "12px" }}>
          Pour exercer votre droit de rétractation, contactez-nous à{" "}
          <a href={`mailto:${EMAIL}`} style={{ color: "#4D8BFF", textDecoration: "none" }}>
            {EMAIL}
          </a>{" "}
          en indiquant votre numéro de commande et votre demande de rétractation.
        </p>
      </Section>

      <Section title="5. Remboursements">
        <p>
          En cas de rétractation dans les délais légaux, nous procédons au remboursement intégral du
          montant payé dans un délai de <strong style={{ color: "#B8B5D1" }}>14 jours</strong>{" "}
          suivant la réception de votre demande, via le même moyen de paiement utilisé lors de la
          commande.
        </p>
        <p style={{ marginTop: "12px" }}>
          En dehors du délai de rétractation légal, aucun remboursement n’est dû pour un abonnement
          en cours. Si vous résiliez votre abonnement avant son terme, vous conservez l’accès
          jusqu’à la fin de la période déjà payée, sans remboursement du prorata.
        </p>
      </Section>

      <Section title="6. Résiliation">
        <p>
          Vous pouvez résilier votre abonnement à tout moment depuis votre espace personnel. La
          résiliation prend effet à la date de fin de la période d’abonnement en cours.
        </p>
        <p style={{ marginTop: "12px" }}>
          {COMPANY} se réserve le droit de résilier un abonnement sans remboursement en cas de
          violation grave des CGU ou des présentes CGV.
        </p>
      </Section>

      <Section title="7. Service après-vente">
        <p>
          Pour toute question relative à votre commande ou abonnement, contactez notre équipe via :
        </p>
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
            E-mail :{" "}
            <a href={`mailto:${EMAIL}`} style={{ color: "#4D8BFF", textDecoration: "none" }}>
              {EMAIL}
            </a>
          </li>
          <li>
            Formulaire de contact : accessible depuis la page{" "}
            <a href="/contact" style={{ color: "#4D8BFF", textDecoration: "none" }}>
              Contact
            </a>
          </li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Nous nous engageons à répondre à toute demande dans un délai de 5 jours ouvrés.
        </p>
      </Section>

      <Section title="8. Droit applicable">
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige relatif à une
          commande, les parties s’engagent à rechercher une solution amiable. À défaut, le litige
          sera soumis aux tribunaux compétents du ressort du siège social de {COMPANY}.
        </p>
        <p style={{ marginTop: "12px" }}>
          Conformément aux dispositions du Code de la consommation relatives au règlement amiable
          des litiges, vous pouvez recourir au service de médiation de la consommation compétent.
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
