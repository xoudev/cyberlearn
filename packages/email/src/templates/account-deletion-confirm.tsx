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

interface AccountDeletionConfirmEmailProps {
  displayName: string;
  confirmUrl: string;
}

export function AccountDeletionConfirmEmail({
  displayName,
  confirmUrl,
}: AccountDeletionConfirmEmailProps): React.ReactElement {
  return (
    <Html lang="fr">
      <EmailHead />
      <Preview>Confirme la suppression de ton compte Cyber Learn</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <EmailBrand />

          <Section style={styles.card}>
            <Heading style={styles.heading}>Confirmation requise</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Text style={styles.paragraph}>
              Tu as demandé la suppression définitive de ton compte Cyber Learn. Cette action est{" "}
              <strong style={shared.detailStrong}>irréversible</strong>.
            </Text>

            <Text style={styles.paragraph}>
              Si tu confirmes, les éléments suivants seront supprimés ou anonymisés :
            </Text>

            <Text style={styles.listItem}>
              · Tes données personnelles (profil, préférences, progression)
            </Text>
            <Text style={styles.listItem}>
              · Tes certificats seront conservés en mode anonyme pour la vérification publique
            </Text>
            <Text style={styles.listItem}>· Tes contributions Q&A et notes seront anonymisées</Text>
            <Text style={styles.listItem}>· Tes logs d'audit seront pseudonymisés</Text>
            <Text style={styles.listItem}>· Cette action ne peut pas être annulée</Text>

            <Section style={styles.buttonWrap}>
              <Button style={{ ...styles.button, ...styles.dangerButton }} href={confirmUrl}>
                Confirmer la suppression
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Ce lien expire dans <strong style={shared.detailStrong}>1 heure</strong>. Si tu n'as
              pas demandé cette suppression, ignore ce mail - aucune action ne sera prise.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d'apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Questions ?{" "}
              <a href="mailto:privacy@cyberlearn.fr" style={styles.footerLink}>
                privacy@cyberlearn.fr
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = shared;

interface SendDeletionConfirmEmailOptions {
  apiKey: string;
  from: string;
  to: string;
  displayName: string;
  confirmUrl: string;
}

export async function sendDeletionConfirmEmail({
  apiKey,
  from,
  to,
  displayName,
  confirmUrl,
}: SendDeletionConfirmEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(AccountDeletionConfirmEmail({ displayName, confirmUrl }));
  const { error } = await resend.emails.send({
    from,
    to,
    // Each request sends its own link and each link expires. Grouped, the only
    // one visible is the newest - which is right - but the older rows are then
    // dead links somebody can still open from the thread.
    subject: stampedSubject("Confirme la suppression de ton compte Cyber Learn", new Date()),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
