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
      <Head />
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
