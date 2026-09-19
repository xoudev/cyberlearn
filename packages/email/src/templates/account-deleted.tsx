import {
  Body,
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
 * Told after the fact, because there is nothing to confirm.
 *
 * The self-service deletion asks first and acts on the reply; this one reports
 * a decision already taken, so it carries no button and no link back into the
 * product - there is no account behind either. What it does carry is the date,
 * the fact that the erasure was complete, and who to write to, which is the
 * only thing the person can still act on.
 */

interface AccountDeletedEmailProps {
  displayName: string;
  /** Localised, formatted by the caller - the template does no i18n. */
  deletedAt: string;
  /** Shown as the address to reply to. */
  contactEmail: string;
  /** Optional note from the administrator. Nothing is invented when absent. */
  reason?: string | undefined;
}

export function AccountDeletedEmail({
  displayName,
  deletedAt,
  contactEmail,
  reason,
}: AccountDeletedEmailProps): React.ReactElement {
  return (
    <Html>
      <EmailHead />
      <Preview>Ton compte CyberLearn a été supprimé</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Ton compte a été supprimé</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Text style={styles.paragraph}>
              Un administrateur de CyberLearn a supprimé ton compte le {deletedAt}. Tu ne peux plus
              t&apos;y connecter.
            </Text>

            {reason !== undefined && reason.length > 0 && (
              <Section style={styles.detail}>
                <Text style={styles.detailMuted}>Motif indiqué</Text>
                <Text style={styles.detailLine}>{reason}</Text>
              </Section>
            )}

            <Text style={styles.paragraph}>Ont été effacés définitivement :</Text>
            <Text style={styles.listItem}>— ton profil, tes préférences et ton avatar ;</Text>
            <Text style={styles.listItem}>
              — ta progression, tes badges, tes séries et tes révisions ;
            </Text>
            <Text style={styles.listItem}>— tes attestations et les fichiers associés ;</Text>
            <Text style={styles.listItem}>— ton identifiant de connexion.</Text>

            <Text style={styles.paragraph}>
              Tes questions et réponses publiées dans les leçons restent en ligne, détachées de ton
              nom : elles aident d&apos;autres personnes et ne t&apos;identifient plus.
            </Text>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Si cette suppression te semble être une erreur, réponds à cet e-mail ou écris à{" "}
              <a href={`mailto:${contactEmail}`} style={styles.footerLink}>
                {contactEmail}
              </a>
              . Les données étant effacées, un compte recréé repartira de zéro.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d&apos;apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Ce message est envoyé une seule fois, au moment de la suppression.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = shared;

interface SendAccountDeletedEmailOptions extends AccountDeletedEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendAccountDeletedEmail({
  apiKey,
  from,
  to,
  ...props
}: SendAccountDeletedEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(AccountDeletedEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Ton compte CyberLearn a été supprimé",
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
