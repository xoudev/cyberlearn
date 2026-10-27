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
import { EmailBrand, EmailHead } from "../shell.js";
import { styles as shared } from "../theme.js";
import { stampedSubject } from "../subject.js";

/**
 * The notice that an account's second factor was removed by the team.
 *
 * It goes out whoever asked, and that is the point of it. The usual story is a
 * lost phone and a message to support: then this mail is the receipt, and its
 * button puts the lock back. The other story is somebody who talked support
 * into it: then this mail is the only way the owner learns their account lost
 * a lock, which is why it says plainly what to do if they asked for nothing.
 *
 * It carries no code and no sign-in link. Nothing in it would help whoever
 * might be reading the mailbox instead of its owner.
 *
 * It does not assume a password: an account created through GitHub has none,
 * so the mail says the person signs in as usual, without a code.
 */

interface MfaResetEmailProps {
  displayName: string;
  /** Formatted for a person by the caller, in Paris time. */
  resetAt: string;
  /** Where the second factor is set up again. */
  securityUrl: string;
  /** True when a verified factor went, which also closed every open session. */
  sessionsClosed: boolean;
  /**
   * Where somebody who asked for nothing tells the team: the site's contact
   * form. Not an address: the only one this mail used to have to hand was the
   * one it is sent from, a noreply that nobody reads.
   */
  contactUrl: string;
  siteUrl: string;
}

export function MfaResetEmail({
  displayName,
  resetAt,
  securityUrl,
  sessionsClosed,
  contactUrl,
  siteUrl,
}: MfaResetEmailProps): React.ReactElement {
  return (
    <Html lang="fr">
      <EmailHead />
      <Preview>La double authentification de ton compte CyberLearn a été retirée</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <EmailBrand />

          <Section style={styles.card}>
            <Heading style={styles.heading}>Ta double authentification a été réinitialisée</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>
            <Text style={styles.paragraph}>
              L&apos;équipe CyberLearn a retiré la double authentification de ton compte le{" "}
              {resetAt}. Tu te connectes comme d&apos;habitude, sans code : ton application
              d&apos;authentification ne sert plus pour CyberLearn.
              {sessionsClosed &&
                " Par sécurité, tes appareils connectés ont été déconnectés : reconnecte-toi."}
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailMuted}>À faire maintenant</Text>
              <Text style={styles.detailLine}>
                Réactive la double authentification, avec ton nouveau téléphone si tu as changé
                d&apos;appareil.
              </Text>
            </Section>

            <Section style={styles.buttonWrap}>
              <Button href={securityUrl} style={styles.button}>
                Réactiver la double authentification
              </Button>
            </Section>

            <Text style={styles.paragraph}>
              Dans l&apos;application mobile, elle se réactive depuis l&apos;écran Sécurité.
            </Text>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Tu n&apos;as rien demandé ? Change ton mot de passe tout de suite (ou celui de ton
              compte GitHub, si tu te connectes avec lui) et préviens-nous depuis{" "}
              <a href={contactUrl} style={styles.footerLink}>
                le formulaire de contact
              </a>{" "}
              : quelqu&apos;un a peut-être tenté de prendre la main sur ton compte.
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

/**
 * Stamped: there is nothing to name, and a second reset months later is a
 * second event that must not hide under the first one's row.
 */
export function mfaResetSubject(sentAt: Date): string {
  return stampedSubject("Ta double authentification a été réinitialisée", sentAt);
}

interface SendMfaResetEmailOptions extends MfaResetEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendMfaResetEmail({
  apiKey,
  from,
  to,
  ...props
}: SendMfaResetEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(MfaResetEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: mfaResetSubject(new Date()),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
