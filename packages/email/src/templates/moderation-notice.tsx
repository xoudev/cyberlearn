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

/**
 * What happened to something somebody wrote.
 *
 * One template for the three moments, because they are one conversation: it
 * was taken down, and then it was either given back or destroyed. Somebody who
 * got the first e-mail is owed the second, and getting them in two different
 * voices reads as two different systems.
 *
 * It quotes what was flagged. Without the excerpt the notice is "something you
 * wrote was removed", which on an account that writes twenty messages a day is
 * not information.
 */

interface ModerationNoticeEmailProps {
  displayName: string;
  /** The heading, already built and already in French. */
  title: string;
  /** The sentence under it, already built. */
  body: string;
  /** What was flagged, trimmed. */
  excerpt: string;
  /** Where to go: the page listing their own moderation record. */
  recordUrl: string;
  siteUrl: string;
}

export function ModerationNoticeEmail({
  displayName,
  title,
  body,
  excerpt,
  recordUrl,
  siteUrl,
}: ModerationNoticeEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>{title}</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>
            <Text style={styles.paragraph}>{body}</Text>

            <Section style={styles.detail}>
              <Text style={styles.detailMuted}>Le passage concerné</Text>
              <Text style={styles.detailLine}>{excerpt}</Text>
            </Section>

            <Section style={styles.buttonWrap}>
              <Button href={recordUrl} style={styles.button}>
                Voir le détail
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Tu reçois cet e-mail parce qu&apos;il concerne un contenu que tu as écrit. Le détail
              de chaque décision reste consultable depuis ton compte.
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

interface SendModerationNoticeEmailOptions extends ModerationNoticeEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendModerationNoticeEmail({
  apiKey,
  from,
  to,
  ...props
}: SendModerationNoticeEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(ModerationNoticeEmail(props));
  const { error } = await resend.emails.send({ from, to, subject: props.title, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
