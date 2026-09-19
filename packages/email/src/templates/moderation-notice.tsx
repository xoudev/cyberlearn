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
      <EmailHead />
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

const styles = shared;

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
  // Stamped rather than named. The notice does have a thing to name - the
  // excerpt of what was flagged - and it is exactly the string that must never
  // reach a subject line: the flagged text is often the reason it was flagged,
  // and an inbox is not where somebody should have to read it again.
  const { error } = await resend.emails.send({
    from,
    to,
    subject: stampedSubject(props.title, new Date()),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
