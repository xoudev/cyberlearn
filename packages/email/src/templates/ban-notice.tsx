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
import { stampedSubject } from "../subject.js";

/**
 * The notice that somebody's account has been banned.
 *
 * It carries the decision itself - the reason, and until when - rather than
 * "your account has been suspended, sign in for details". Somebody who has just
 * been locked out should not have to go and fetch the reason from the place
 * they have been locked out of.
 *
 * The button goes to the page where they can answer it, because a decision
 * nobody can contest is a decision nobody can correct.
 */

interface BanNoticeEmailProps {
  displayName: string;
  /** Why, in the moderator's words. */
  reason: string;
  /** Already in French: "Ce bannissement est définitif." or "Il reste 3 jours." */
  durationLabel: string;
  /** Null for a permanent ban. Formatted for a person, not an ISO string. */
  endsOn: string | null;
  appealUrl: string;
  siteUrl: string;
}

export function BanNoticeEmail({
  displayName,
  reason,
  durationLabel,
  endsOn,
  appealUrl,
  siteUrl,
}: BanNoticeEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Ton compte CyberLearn a été suspendu</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Ton compte a été suspendu</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>
            <Text style={styles.paragraph}>
              L&apos;équipe de modération a suspendu ton accès à CyberLearn. Ta progression, tes
              notes et tes badges sont intacts : rien n&apos;a été supprimé.
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailMuted}>Motif</Text>
              <Text style={styles.detailLine}>{reason}</Text>
            </Section>

            <Section style={styles.detail}>
              <Text style={styles.detailMuted}>Durée</Text>
              <Text style={styles.detailLine}>
                {endsOn === null ? durationLabel : `Jusqu'au ${endsOn}`}
              </Text>
            </Section>

            <Section style={styles.buttonWrap}>
              <Button href={appealUrl} style={styles.button}>
                Faire appel
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Si tu penses que cette décision est une erreur, tu peux la contester : le bouton
              ci-dessus ouvre un échange avec l&apos;équipe de modération, qui te répondra par
              e-mail.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>CyberLearn</Text>
            <Text style={styles.footerText}>
              <a href={siteUrl} style={styles.footerLink}>
                {siteUrl.replace(/^https?:\/\//u, "")}
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

  detail: {
    borderLeft: "3px solid #0AFFD4",
    paddingLeft: "14px",
    margin: "22px 0 4px",
  } satisfies React.CSSProperties,

  detailLine: {
    fontSize: "15px",
    color: "#F5F5FA",
    margin: "0 0 4px",
  } satisfies React.CSSProperties,

  detailStrong: {
    color: "#F5F5FA",
  } satisfies React.CSSProperties,

  detailMuted: {
    fontSize: "12px",
    color: "#6B6890",
    margin: "0 0 3px",
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

interface SendBanNoticeEmailOptions extends BanNoticeEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendBanNoticeEmail({
  apiKey,
  from,
  to,
  ...props
}: SendBanNoticeEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(BanNoticeEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    // A second suspension is a different event from the first, and reading it
    // under the first one's heading hides that it happened at all.
    subject: stampedSubject("Ton compte CyberLearn a été suspendu", new Date()),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
