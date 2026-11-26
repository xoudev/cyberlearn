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
import type React from "react";
import { Resend } from "resend";
import { EmailBrand, EmailHead } from "../shell.js";
import { styles as shared } from "../theme.js";

/**
 * A learner answering the team, in the inbox of the administrator who wrote
 * to them (every administrator when that one is gone).
 *
 * Sent once when the learner starts answering, not for every line: the
 * console counts the rest. It carries the answer itself, like the e-mail a
 * learner gets for a ticket, so the administrator knows at once whether it
 * waits on them; replying happens in the console.
 *
 * One subject per learner on purpose (rule 14's exception for a conversation):
 * a mail client threads their answers together.
 */

interface TeamReplyEmailProps {
  /** Who it goes to. */
  adminName: string;
  /** The learner, as the console names them: "Ada (@ada)". */
  learnerLabel: string;
  /** What the learner wrote. */
  reply: string;
  conversationUrl: string;
}

export function teamReplySubject(learnerLabel: string): string {
  return `Réponse de ${learnerLabel} à l'équipe CyberLearn`;
}

export function TeamReplyEmail({
  adminName,
  learnerLabel,
  reply,
  conversationUrl,
}: TeamReplyEmailProps): React.ReactElement {
  return (
    <Html lang="fr">
      <EmailHead />
      <Preview>{teamReplySubject(learnerLabel)}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <EmailBrand />

          <Section style={styles.card}>
            <Heading style={styles.heading}>Un apprenant a répondu</Heading>

            <Text style={styles.paragraph}>Bonjour {adminName},</Text>

            <Text style={styles.paragraph}>
              {learnerLabel} a répondu au message de l&apos;équipe :
            </Text>

            <Section style={styles.detail}>
              <Text style={{ ...styles.detailLine, whiteSpace: "pre-wrap" }}>{reply}</Text>
            </Section>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={conversationUrl}>
                Ouvrir la conversation
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Tu réponds depuis la console. Les messages suivants de cette personne n&apos;envoient
              pas d&apos;autre e-mail tant que la conversation n&apos;a pas été lue : la console les
              compte dans Messages. Répondre à cet e-mail n&apos;arrivera nulle part.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>Cyber Learn · Console d&apos;administration</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = shared;

interface SendTeamReplyEmailOptions extends TeamReplyEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendTeamReplyEmail({
  apiKey,
  from,
  to,
  ...props
}: SendTeamReplyEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(TeamReplyEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: teamReplySubject(props.learnerLabel),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
