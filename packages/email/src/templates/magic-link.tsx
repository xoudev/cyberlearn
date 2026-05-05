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

export type EmailActionType = "magiclink" | "signup" | "recovery" | "invite" | "email_change";

interface MagicLinkEmailProps {
  magicLink: string;
  type?: EmailActionType;
}

const SUBJECT: Record<EmailActionType, string> = {
  magiclink: "Ton lien de connexion — Cyber Learn",
  signup: "Confirme ton compte — Cyber Learn",
  recovery: "Réinitialise ton accès — Cyber Learn",
  invite: "Tu es invité sur Cyber Learn",
  email_change: "Confirme ton nouvel email — Cyber Learn",
};

const HEADING: Record<EmailActionType, string> = {
  magiclink: "Connexion à Cyber Learn",
  signup: "Confirme ton compte",
  recovery: "Réinitialise ton accès",
  invite: "Invitation à rejoindre",
  email_change: "Changement d'adresse email",
};

const DESCRIPTION: Record<EmailActionType, string> = {
  magiclink: "Clique sur le bouton ci-dessous pour te connecter à ta plateforme d'apprentissage.",
  signup: "Clique ci-dessous pour confirmer ton compte et commencer à apprendre.",
  recovery: "Clique ci-dessous pour réinitialiser l'accès à ton compte.",
  invite: "Tu as été invité à rejoindre Cyber Learn. Clique ci-dessous pour accepter.",
  email_change: "Clique ci-dessous pour confirmer ton nouvel email.",
};

const BUTTON_LABEL: Record<EmailActionType, string> = {
  magiclink: "Se connecter →",
  signup: "Confirmer mon compte →",
  recovery: "Réinitialiser mon accès →",
  invite: "Accepter l'invitation →",
  email_change: "Confirmer le changement →",
};

export function MagicLinkEmail({
  magicLink,
  type = "magiclink",
}: MagicLinkEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{SUBJECT[type]}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>{HEADING[type]}</Heading>
            <Text style={styles.paragraph}>{DESCRIPTION[type]}</Text>
            <Text style={styles.paragraph}>
              Ce lien expire dans <strong style={{ color: "#F5F5FA" }}>1 heure</strong> et ne peut
              être utilisé qu'une seule fois.
            </Text>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={magicLink}>
                {BUTTON_LABEL[type]}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Si tu n'es pas à l'origine de cette demande, ignore cet email. Aucune action n'est
              requise.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn — Plateforme d'apprentissage en cybersécurité & développement
            </Text>
            <Text style={styles.footerText}>
              <a href="https://cyberlearn.fr" style={styles.footerLink}>
                cyberlearn.fr
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function getMagicLinkSubject(type: EmailActionType | string): string {
  return SUBJECT[type as EmailActionType] ?? SUBJECT.magiclink;
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

interface SendMagicLinkOptions {
  apiKey: string;
  from: string;
  to: string;
  magicLink: string;
  type?: EmailActionType;
}

export async function sendMagicLinkEmail({
  apiKey,
  from,
  to,
  magicLink,
  type = "magiclink",
}: SendMagicLinkOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(MagicLinkEmail({ magicLink, type }));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: getMagicLinkSubject(type),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
