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
      <EmailHead />
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
              Crée ton compte avec cette adresse,{" "}
              <strong style={styles.detailStrong}>{email}</strong>, et tu rejoindras la classe
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

const styles = shared;

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
