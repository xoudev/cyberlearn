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

interface ClassEnrolledEmailProps {
  displayName: string;
  className: string;
  establishmentName: string;
  promotionName: string;
  /** Empty when the class has no teacher assigned yet - the line is dropped. */
  teacherNames: string[];
  profileUrl: string;
}

export function ClassEnrolledEmail({
  displayName,
  className,
  establishmentName,
  promotionName,
  teacherNames,
  profileUrl,
}: ClassEnrolledEmailProps): React.ReactElement {
  return (
    <Html>
      <EmailHead />
      <Preview>{`Tu fais maintenant partie de ${className}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Tu as rejoint {className}</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Text style={styles.paragraph}>
              Ton compte vient d&apos;être rattaché à une classe. Tu y retrouveras tes camarades et
              la progression de chacun, directement depuis ton profil.
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailLine}>
                <strong style={styles.detailStrong}>{className}</strong>
              </Text>
              <Text style={styles.detailMuted}>
                {establishmentName} · {promotionName}
              </Text>
              {teacherNames.length > 0 && (
                <Text style={styles.detailMuted}>
                  {teacherNames.length > 1 ? "Professeurs" : "Professeur"} :{" "}
                  {teacherNames.join(", ")}
                </Text>
              )}
            </Section>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={profileUrl}>
                Voir ma classe →
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Rien ne change pour tes parcours ni pour ta progression : rejoindre une classe ajoute
              tes camarades à ton profil, rien de plus. Tu peux masquer ton profil aux autres depuis
              tes préférences de confidentialité.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d&apos;apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Tu peux couper ces e-mails dans{" "}
              <a
                href={`${profileUrl.replace(/\/profile$/u, "")}/settings/notifications`}
                style={styles.footerLink}
              >
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

interface SendClassEnrolledEmailOptions extends ClassEnrolledEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendClassEnrolledEmail({
  apiKey,
  from,
  to,
  ...props
}: SendClassEnrolledEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(ClassEnrolledEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Tu as rejoint ${props.className}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
