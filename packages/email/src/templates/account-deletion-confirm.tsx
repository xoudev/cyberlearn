import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";
import React from "react";
import { Resend } from "resend";

interface AccountDeletionConfirmEmailProps {
  displayName: string;
  confirmUrl: string;
}

export function AccountDeletionConfirmEmail({
  displayName,
  confirmUrl,
}: AccountDeletionConfirmEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Confirmez la suppression de votre compte Cyber Learn</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Confirmation requise</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Text style={styles.paragraph}>
              Vous avez demandé la suppression définitive de votre compte Cyber Learn. Cette action
              est <strong style={{ color: "#F5F5FA" }}>irréversible</strong>.
            </Text>

            <Text style={styles.paragraph}>
              Si vous confirmez, les éléments suivants seront supprimés ou anonymisés :
            </Text>

            <Text style={styles.listItem}>
              · Vos données personnelles (profil, préférences, progression)
            </Text>
            <Text style={styles.listItem}>
              · Vos certificats seront conservés en mode anonyme pour la vérification publique
            </Text>
            <Text style={styles.listItem}>· Vos contributions Q&A et notes seront anonymisées</Text>
            <Text style={styles.listItem}>· Vos logs d'audit seront pseudonymisés</Text>
            <Text style={styles.listItem}>· Cette action ne peut pas être annulée</Text>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={confirmUrl}>
                Confirmer la suppression →
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Ce lien expire dans <strong style={{ color: "#F5F5FA" }}>1 heure</strong>. Si vous
              n'avez pas demandé cette suppression, ignorez ce mail — aucune action ne sera prise.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d'apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Questions ?{" "}
              <a href="mailto:privacy@cyberlearn.fr" style={styles.footerLink}>
                privacy@cyberlearn.fr
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: "#030219",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "40px 0",
  } satisfies React.CSSProperties,

  container: {
    maxWidth: "520px",
    margin: "0 auto",
  } satisfies React.CSSProperties,

  logoSection: {
    paddingBottom: "20px",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  logoText: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.25em",
    color: "#0AFFD4",
    margin: "0",
  } satisfies React.CSSProperties,

  card: {
    backgroundColor: "#0A0826",
    border: "1px solid #1F1B47",
    borderRadius: "12px",
    padding: "40px 36px",
  } satisfies React.CSSProperties,

  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#F5F5FA",
    margin: "0 0 16px",
    letterSpacing: "-0.02em",
  } satisfies React.CSSProperties,

  paragraph: {
    fontSize: "14px",
    color: "#B8B5D1",
    lineHeight: "1.65",
    margin: "0 0 14px",
  } satisfies React.CSSProperties,

  listItem: {
    fontSize: "14px",
    color: "#B8B5D1",
    lineHeight: "1.65",
    margin: "0 0 6px",
    paddingLeft: "4px",
  } satisfies React.CSSProperties,

  buttonWrap: {
    margin: "28px 0",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  button: {
    backgroundColor: "#0024FF",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "14px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
  } satisfies React.CSSProperties,

  hr: {
    borderColor: "#1F1B47",
    margin: "24px 0",
  } satisfies React.CSSProperties,

  muted: {
    fontSize: "12px",
    color: "#6B6890",
    lineHeight: "1.5",
    margin: "0",
  } satisfies React.CSSProperties,

  footer: {
    paddingTop: "20px",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  footerText: {
    fontSize: "11px",
    color: "#3F3D5C",
    margin: "0 0 4px",
  } satisfies React.CSSProperties,

  footerLink: {
    color: "#4D8BFF",
    textDecoration: "none",
  } satisfies React.CSSProperties,
} as const;

interface SendDeletionConfirmEmailOptions {
  apiKey: string;
  from: string;
  to: string;
  displayName: string;
  confirmUrl: string;
}

export async function sendDeletionConfirmEmail({
  apiKey,
  from,
  to,
  displayName,
  confirmUrl,
}: SendDeletionConfirmEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(AccountDeletionConfirmEmail({ displayName, confirmUrl }));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Confirmez la suppression de votre compte Cyber Learn",
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
