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
 * The team's answer to a ticket, in the requester's inbox.
 *
 * It carries the answer itself rather than "you have a new message, sign in to
 * read it". Someone waiting on a reply should not have to go and fetch it, and
 * a notification with no content is a second errand rather than an answer.
 *
 * The link is still there, because replying happens on the site: this e-mail is
 * the answer, the page is the conversation.
 */

interface TicketReplyEmailProps {
  displayName: string;
  subject: string;
  /** What the team wrote. */
  reply: string;
  /** How the ticket stands after the reply, already in French. */
  statusLabel: string;
  ticketUrl: string;
  siteUrl: string;
}

export function TicketReplyEmail({
  displayName,
  subject,
  reply,
  statusLabel,
  ticketUrl,
  siteUrl,
}: TicketReplyEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{`Réponse à ta demande : ${subject}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Réponse à ta demande</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Section style={styles.detail}>
              <Text style={styles.detailLine}>
                <strong style={styles.detailStrong}>{subject}</strong>
              </Text>
              <Text style={styles.detailMuted}>État : {statusLabel}</Text>
            </Section>

            {/* The answer itself, not a summons to come and read it. */}
            <Text style={styles.paragraph}>{reply}</Text>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={ticketUrl}>
                Voir la demande →
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Tu peux répondre depuis la page de ta demande. Répondre à cet e-mail n&apos;arrivera
              nulle part.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d&apos;apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Tu peux couper ces e-mails dans{" "}
              <a href={`${siteUrl}/settings/notifications`} style={styles.footerLink}>
                tes préférences de notification
              </a>
              .
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

interface SendTicketReplyEmailOptions extends TicketReplyEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendTicketReplyEmail({
  apiKey,
  from,
  to,
  ...props
}: SendTicketReplyEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(TicketReplyEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Réponse à ta demande : ${props.subject}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
