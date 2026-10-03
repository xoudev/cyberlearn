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
 * The notice that an account unused for nearly two years is about to be
 * erased, as the privacy policy says it will be.
 *
 * It says when, what goes and what stays, and keeps the account in one click:
 * the person may not remember their password, and should not have to recover
 * it just to say "keep it". Signing in keeps it too.
 */

interface InactivityNoticeEmailProps {
  displayName: string;
  /** The day the erasure can come, formatted for a person: "2 novembre 2026". */
  eraseOn: string;
  keepUrl: string;
  siteUrl: string;
}

export function InactivityNoticeEmail({
  displayName,
  eraseOn,
  keepUrl,
  siteUrl,
}: InactivityNoticeEmailProps): React.ReactElement {
  return (
    <Html>
      <EmailHead />
      <Preview>{`Ton compte CyberLearn sera supprimé le ${eraseOn}, sauf si tu le gardes`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Ton compte va être supprimé</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>
            <Text style={styles.paragraph}>
              Ton compte CyberLearn n&apos;a pas servi depuis bientôt deux ans. Comme le dit notre
              politique de confidentialité, un compte inutilisé pendant 24 mois est supprimé : nous
              ne gardons pas de données dont personne ne se sert.
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailMuted}>Suppression prévue</Text>
              <Text style={styles.detailLine}>Le {eraseOn}</Text>
            </Section>

            <Text style={styles.paragraph}>
              Ce jour-là, ton profil, ta progression et tes badges disparaîtront. Ce que tu as
              publié (messages du forum, questions et réponses sous les leçons) restera lisible sans
              ton nom, et tes certificats resteront vérifiables, sans ton nom non plus.
            </Text>

            <Section style={styles.buttonWrap}>
              <Button href={keepUrl} style={styles.button}>
                Garder mon compte
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Te connecter sur le site, ou finir une leçon, avant cette date garde aussi ton compte.
              Si tu ne veux plus de ton compte, tu n&apos;as rien à faire.
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

/** The subject: it names the date, so a later notice never hides under an earlier one. */
export function inactivityNoticeSubject(eraseOn: string): string {
  return `Ton compte CyberLearn sera supprimé le ${eraseOn}`;
}

interface SendInactivityNoticeEmailOptions extends InactivityNoticeEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendInactivityNoticeEmail({
  apiKey,
  from,
  to,
  ...props
}: SendInactivityNoticeEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(InactivityNoticeEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: inactivityNoticeSubject(props.eraseOn),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
