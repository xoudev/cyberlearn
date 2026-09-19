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
 * Work a teacher has set for a class, in the learner's inbox.
 *
 * The in-app bell was the only channel, which meant the work was announced to
 * people who were already on the site - and the ones who most need telling are
 * exactly the ones who are not. A deadline nobody saw is a deadline nobody
 * meets.
 *
 * One template for both kinds of work rather than two nearly-identical ones:
 * what changes between a lesson and a path is a noun and a link, and two files
 * would be two places for the footer and the unsubscribe line to drift apart.
 */

export type AssignedWorkKind = "lesson" | "path";

interface WorkAssignedEmailProps {
  displayName: string;
  kind: AssignedWorkKind;
  /** The lesson's or path's own title. */
  workTitle: string;
  className: string;
  teacherName: string;
  /** Already formatted in French by the caller, which owns the locale. */
  dueLabel: string | null;
  /** What the teacher typed alongside it, if anything. */
  instructions: string | null;
  workUrl: string;
  /** Site root, for the unsubscribe link in the footer. */
  siteUrl: string;
}

const NOUN: Record<AssignedWorkKind, { subject: string; heading: string; cta: string }> = {
  lesson: {
    subject: "Nouvelle leçon à faire",
    heading: "Une leçon t'attend",
    cta: "Ouvrir la leçon →",
  },
  path: {
    subject: "Nouveau parcours pour ta classe",
    heading: "Un parcours t'attend",
    cta: "Ouvrir le parcours →",
  },
};

export function WorkAssignedEmail({
  displayName,
  kind,
  workTitle,
  className,
  teacherName,
  dueLabel,
  instructions,
  workUrl,
  siteUrl,
}: WorkAssignedEmailProps): React.ReactElement {
  const noun = NOUN[kind];

  return (
    <Html>
      <EmailHead />
      <Preview>{`${noun.subject} : ${workTitle}`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Text style={styles.logoText}>CYBER LEARN</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.heading}>{noun.heading}</Heading>

            <Text style={styles.paragraph}>Bonjour {displayName},</Text>

            <Text style={styles.paragraph}>
              {teacherName} vient de donner du travail à {className}.
            </Text>

            <Section style={styles.detail}>
              <Text style={styles.detailLine}>
                <strong style={styles.detailStrong}>{workTitle}</strong>
              </Text>
              {/* The deadline is the one line in this e-mail that can be missed,
                  so it is in the block rather than in the prose above it. */}

              {/* The deadline is the one line in this e-mail that can be missed,
                  so it is in the block rather than in the prose above it. */}
              <Text style={styles.detailMuted}>
                {dueLabel === null ? "Sans date limite" : `À rendre avant le ${dueLabel}`}
              </Text>
              {instructions !== null && <Text style={styles.detailMuted}>{instructions}</Text>}
            </Section>

            <Section style={styles.buttonWrap}>
              <Button style={styles.button} href={workUrl}>
                {noun.cta}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Tu retrouves tout ce qui t&apos;a été donné, et ce qu&apos;il te reste à faire, sur la
              page Ma classe.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Cyber Learn · Plateforme d&apos;apprentissage en cybersécurité &amp; développement
            </Text>
            <Text style={styles.footerText}>
              Tu peux couper ces e-mails dans{" "}
              <a href={`${siteUrl}/settings/notifications`} style={styles.footerLink}>
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

interface SendWorkAssignedEmailOptions extends WorkAssignedEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendWorkAssignedEmail({
  apiKey,
  from,
  to,
  ...props
}: SendWorkAssignedEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(WorkAssignedEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${NOUN[props.kind].subject} : ${props.workTitle}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
