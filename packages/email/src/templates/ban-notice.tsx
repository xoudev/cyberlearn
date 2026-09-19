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
      <EmailHead />
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

const styles = shared;

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
