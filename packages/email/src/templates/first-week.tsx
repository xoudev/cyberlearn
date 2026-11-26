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
 * The first week after sign-up, in three e-mails (apps/web/lib/onboarding):
 *
 * - day 1, when no lesson is finished yet: the first mission, named;
 * - day 3, when nothing was finished for two days: the next one, named;
 * - day 7: the week told back in three numbers, and what comes next.
 *
 * Each names its lesson or its count in the subject (rule 14), says one thing
 * and offers one button. They are cut, with the others, from the preferences
 * the footer links to.
 */

export type FirstWeekStep = "FIRST_MISSION" | "COME_BACK" | "FIRST_WEEK";

/** The lesson the e-mail sends to: the dashboard's mission. */
export interface FirstWeekLesson {
  title: string;
  minutes: number;
  xp: number;
  url: string;
}

/** The first week told back, for day 7. */
export interface FirstWeekTally {
  lessons: number;
  xp: number;
  streakDays: number;
}

export interface FirstWeekEmailProps {
  step: FirstWeekStep;
  displayName: string;
  /** Null when there is no lesson to offer: the button opens the paths. */
  lesson: FirstWeekLesson | null;
  /** Day 7 only. */
  tally?: FirstWeekTally;
  siteUrl: string;
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count > 1 ? many : one}`;
}

/** The subject: the lesson it names, or the week's count, never the same twice. */
export function firstWeekSubject(
  step: FirstWeekStep,
  lesson: FirstWeekLesson | null,
  tally?: FirstWeekTally,
): string {
  if (step === "FIRST_WEEK") {
    const lessons = tally?.lessons ?? 0;
    return lessons > 0
      ? `Ta première semaine sur CyberLearn : ${plural(lessons, "leçon terminée", "leçons terminées")}`
      : "Ta première semaine sur CyberLearn";
  }
  if (lesson === null) return "Ton premier parcours t'attend sur CyberLearn";
  return step === "FIRST_MISSION"
    ? `Ta première mission : ${lesson.title}`
    : `Ta prochaine mission : ${lesson.title}`;
}

function Lesson({ lesson }: { lesson: FirstWeekLesson }): React.ReactElement {
  return (
    <Section style={styles.detail}>
      <Text
        style={styles.detailMuted}
      >{`${String(lesson.minutes)} min · +${String(lesson.xp)} XP`}</Text>
      <Text style={styles.detailLine}>{lesson.title}</Text>
    </Section>
  );
}

export function FirstWeekEmail({
  step,
  displayName,
  lesson,
  tally,
  siteUrl,
}: FirstWeekEmailProps): React.ReactElement {
  const cta = lesson
    ? { href: lesson.url, label: step === "FIRST_MISSION" ? "Commencer la leçon" : "Reprendre" }
    : { href: `${siteUrl}/paths`, label: "Choisir un parcours" };

  let heading: string;
  let body: React.ReactNode;
  let preview: string;

  if (step === "FIRST_MISSION") {
    heading = "Ta première mission";
    preview = lesson
      ? `${lesson.title}, en ${String(lesson.minutes)} minutes`
      : "Choisis un parcours, la première leçon suit";
    body = (
      <>
        <Text style={styles.paragraph}>
          Ton compte est prêt, il ne manque que la première leçon. Elle se fait en une fois, avec un
          quiz à la fin, et c&apos;est elle qui lance ta série.
        </Text>
        {lesson ? <Lesson lesson={lesson} /> : null}
      </>
    );
  } else if (step === "COME_BACK") {
    heading = "On reprend où tu en étais ?";
    preview = lesson ? `${lesson.title} t'attend` : "Ton parcours t'attend";
    body = (
      <>
        <Text style={styles.paragraph}>
          Ça fait deux jours sans leçon. Une seule aujourd&apos;hui suffit à relancer ta série, et
          les questions ratées reviennent ensuite d&apos;elles-mêmes dans ton rappel du jour.
        </Text>
        {lesson ? <Lesson lesson={lesson} /> : null}
      </>
    );
  } else {
    const lessons = tally?.lessons ?? 0;
    heading = "Ta première semaine";
    preview =
      lessons > 0
        ? `${plural(lessons, "leçon", "leçons")}, ${String(tally?.xp ?? 0)} XP`
        : "Ce qui t'attend la semaine prochaine";
    body =
      lessons > 0 ? (
        <>
          <Text style={styles.paragraph}>Voilà ta première semaine sur CyberLearn :</Text>
          <Section style={styles.detail}>
            <Text style={styles.detailLine}>
              {plural(lessons, "leçon terminée", "leçons terminées")}
            </Text>
            <Text style={styles.detailLine}>{`${String(tally?.xp ?? 0)} XP`}</Text>
            <Text style={styles.detailLine}>
              {(tally?.streakDays ?? 0) > 0
                ? `Série en cours : ${plural(tally?.streakDays ?? 0, "jour", "jours")}`
                : "Pas de série en cours"}
            </Text>
          </Section>
          <Text style={styles.paragraph}>
            {lesson ? "La suite de ton parcours :" : "Ton parcours est fini : choisis le suivant."}
          </Text>
          {lesson ? <Lesson lesson={lesson} /> : null}
        </>
      ) : (
        <>
          <Text style={styles.paragraph}>
            Ta première semaine s&apos;est passée sans leçon. Pas de souci : ta place est gardée, et
            la première mission prend une demi-heure au plus.
          </Text>
          {lesson ? <Lesson lesson={lesson} /> : null}
        </>
      );
  }

  return (
    <Html lang="fr">
      <EmailHead />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <EmailBrand />

          <Section style={styles.card}>
            <Heading style={styles.heading}>{heading}</Heading>
            <Text style={styles.paragraph}>Bonjour {displayName},</Text>
            {body}

            <Section style={styles.buttonWrap}>
              <Button href={cta.href} style={styles.button}>
                {cta.label}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.muted}>
              Ces trois e-mails accompagnent ta première semaine, et s&apos;arrêtent après. Une
              question, un souci : la page{" "}
              <a href={`${siteUrl}/support`} style={styles.footerLink}>
                Aide
              </a>{" "}
              du site.
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

interface SendFirstWeekEmailOptions extends FirstWeekEmailProps {
  apiKey: string;
  from: string;
  to: string;
}

export async function sendFirstWeekEmail({
  apiKey,
  from,
  to,
  ...props
}: SendFirstWeekEmailOptions): Promise<void> {
  const resend = new Resend(apiKey);
  const html = await render(FirstWeekEmail(props));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: firstWeekSubject(props.step, props.lesson, props.tally),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
