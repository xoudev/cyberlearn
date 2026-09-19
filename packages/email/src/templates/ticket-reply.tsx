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
      <EmailHead />
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

const styles = shared;

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
