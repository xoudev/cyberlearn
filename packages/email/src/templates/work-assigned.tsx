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
      <Head />
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
