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
 * An invitation that carries no secret.
 *
 * There is no token in this link, and that is the point. A token is
 * forwardable: whoever opened it would land in a stranger's class, looking at
 * their classmates' names. The invitation is bound to the address instead, and
 * Supabase has verified the address by the time anyone signs in with it - so
 * this mail can point at the ordinary sign-up page and say, truthfully, that
 * signing up with this address is what joins the class.
 *
 * Which also means forwarding it is harmless, and a second copy of it does
 * nothing a first one did not.
 */

interface ClassInvitationEmailProps {
  className: string;
  establishmentName: string;
  promotionName: string;
  /** The address the invitation is bound to - stated, because it is the key. */
  email: string;
  /** Localised, formatted by the caller. */
  expiresAt: string;
  signUpUrl: string;
}

export function ClassInvitationEmail({
  className,
  establishmentName,
  promotionName,
  email,
  expiresAt,
  signUpUrl,
}: ClassInvitationEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{`Tu es invité·e à rejoindre ${className} sur CyberLearn`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>Rejoins {className}</Heading>

            <Text style={styles.paragraph}>
              Un administrateur t&apos;a inscrit·e à une classe sur CyberLearn, la plateforme
              d&apos;apprentissage en cybersécurité et développement.
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailLine}>
                <strong style={styles.detailStrong}>{className}</strong>
              </Text>
              <Text style={styles.detailMuted}>
                {establishmentName} · {promotionName}
              </Text>
            </Section>

            <Text style={styles.paragraph}>
              Crée ton compte avec cette adresse —{" "}
              <strong style={styles.detailStrong}>{email}</strong> — et tu rejoindras la classe
              automatiquement à ta première connexion.
            </Text>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={signUpUrl}>
                Créer mon compte →
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              C&apos;est bien l&apos;adresse qui compte, pas ce lien : il ne contient aucun code et
              ne fonctionne pour personne d&apos;autre. Si tu as déjà un compte avec{" "}
              <strong style={styles.detailStrong}>{email}</strong>, connecte-toi simplement.
            </Text>
            <Text style={styles.muted}>
              Cette invitation est valable jusqu&apos;au {expiresAt}.
            </Text>
            <Text style={styles.muted}>
              Tu ne connais pas cet établissement ? Ignore ce message : sans compte créé avec cette
              adresse, rien ne se passe.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d&apos;apprentissage en cybersécurité &amp; développement
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
    margin: "22px 0",
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
    margin: "0",
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
    margin: "0 0 8px",
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
} as const;

interface SendClassInvitationEmailOptions extends ClassInvitationEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendClassInvitationEmail({
  apiKey,
  from,
  to,
  ...props
}: SendClassInvitationEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(ClassInvitationEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Rejoins ${props.className} sur CyberLearn`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
