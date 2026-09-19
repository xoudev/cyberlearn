import {
  Body,
  Button,
  Container,
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
import { EmailHead } from "../shell.js";
import { styles as shared } from "../theme.js";
import { stampedSubject } from "../subject.js";

export type EmailActionType = "magiclink" | "signup" | "recovery" | "invite" | "email_change";

interface MagicLinkEmailProps {
  magicLink: string;
  type?: EmailActionType;
  /** 6-digit OTP code, shown for the mobile app (which cannot follow the link). */
  code?: string | undefined;
}

const SUBJECT: Record<EmailActionType, string> = {
  magiclink: "Ton lien de connexion · Cyber Learn",
  signup: "Confirme ton compte · Cyber Learn",
  recovery: "Réinitialise ton accès · Cyber Learn",
  invite: "Tu es invité sur Cyber Learn",
  email_change: "Confirme ton nouvel email · Cyber Learn",
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
  code,
}: MagicLinkEmailProps): React.ReactElement {
  return (
    <Html>
      <EmailHead />
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

            {code ? (
              <Section style={styles.codeWrap}>
                <Text style={styles.codeLabel}>Ou entre ce code dans l&apos;app mobile</Text>
                <Text style={styles.code}>{code}</Text>
              </Section>
            ) : null}

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Si tu n'es pas à l'origine de cette demande, ignore cet email. Aucune action n'est
              requise.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d'apprentissage en cybersécurité & développement
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

export function getMagicLinkSubject(type: string, sentAt: Date = new Date()): string {
  // SAFETY: Supabase Auth may pass an unrecognized type string at runtime - cast
  // widens the Record type so the ?? fallback is type-valid for unknown keys.
  const base = (SUBJECT as Record<string, string | undefined>)[type] ?? SUBJECT.magiclink;
  // Stamped, because this is the one mail somebody receives over and over with
  // nothing in it to tell one from another. Six identical "Ton lien de
  // connexion" collapse into a single row where only the newest is visible -
  // and the newest is exactly the one being looked for.
  return stampedSubject(base, sentAt);
}

/** Layered over the shared vocabulary: what this mail alone needs. */
const styles = {
  ...shared,

  codeWrap: {
    margin: "8px 0 4px",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  codeLabel: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: "11px",
    color: "#6B6890",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: "0 0 8px",
  } satisfies React.CSSProperties,

  code: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: "30px",
    fontWeight: "700",
    letterSpacing: "0.35em",
    color: "#0AFFD4",
    margin: "0",
  } satisfies React.CSSProperties,
} as const;

interface SendMagicLinkOptions {
  apiKey: string;
  from: string;
  to: string;
  magicLink: string;
  type?: EmailActionType;
  code?: string | undefined;
}

export async function sendMagicLinkEmail({
  apiKey,
  from,
  to,
  magicLink,
  type = "magiclink",
  code,
}: SendMagicLinkOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(MagicLinkEmail({ magicLink, type, code }));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: getMagicLinkSubject(type),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
