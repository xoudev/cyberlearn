import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { AccountDeletedEmail } from "../templates/account-deleted";
import { AccountDeletionConfirmEmail } from "../templates/account-deletion-confirm";
import { BanNoticeEmail } from "../templates/ban-notice";
import { ClassEnrolledEmail } from "../templates/class-enrolled";
import { ClassInvitationEmail } from "../templates/class-invitation";
import { MagicLinkEmail } from "../templates/magic-link";
import { ModerationNoticeEmail } from "../templates/moderation-notice";
import { TicketReplyEmail } from "../templates/ticket-reply";
import { WorkAssignedEmail } from "../templates/work-assigned";
import { tokens } from "../theme";

/**
 * The mails against the site's design system, checked on the rendered HTML.
 *
 * Every template used to carry its own copy of the styles, which is how they
 * drifted in the first place. They share one now - but sharing it is only half
 * the guarantee, because a template can still set its own rounded corner or
 * name a font the site does not use. So this asserts on what comes out.
 */

const RENDERED: [string, React.ReactElement][] = [
  [
    "magic-link",
    MagicLinkEmail({ magicLink: "https://cyberlearn.fr/x", type: "magiclink", code: "483920" }),
  ],
  [
    "ticket-reply",
    TicketReplyEmail({
      displayName: "Amélie",
      subject: "Une demande",
      reply: "Une réponse.",
      statusLabel: "Résolu",
      ticketUrl: "https://cyberlearn.fr/support/1",
      siteUrl: "https://cyberlearn.fr",
    }),
  ],
  [
    "work-assigned",
    WorkAssignedEmail({
      displayName: "Amélie",
      kind: "lesson",
      workTitle: "Injections SQL",
      className: "Terminale NSI",
      teacherName: "M. Ferrand",
      dueLabel: "vendredi",
      instructions: null,
      workUrl: "https://cyberlearn.fr/l/x",
      siteUrl: "https://cyberlearn.fr",
    }),
  ],
  [
    "class-enrolled",
    ClassEnrolledEmail({
      displayName: "Amélie",
      className: "Terminale NSI",
      establishmentName: "Lycée Jean-Moulin",
      promotionName: "Promo 2026",
      teacherNames: ["M. Ferrand"],
      profileUrl: "https://cyberlearn.fr/my-class",
    }),
  ],
  [
    "class-invitation",
    ClassInvitationEmail({
      className: "Terminale NSI",
      establishmentName: "Lycée Jean-Moulin",
      promotionName: "Promo 2026",
      email: "a@b.fr",
      expiresAt: "3 octobre",
      signUpUrl: "https://cyberlearn.fr/register",
    }),
  ],
  [
    "ban-notice",
    BanNoticeEmail({
      displayName: "Amélie",
      reason: "Charte.",
      durationLabel: "7 jours",
      endsOn: "26 septembre",
      appealUrl: "https://cyberlearn.fr/banned",
      siteUrl: "https://cyberlearn.fr",
    }),
  ],
  [
    "moderation-notice",
    ModerationNoticeEmail({
      displayName: "Amélie",
      title: "Ton message est en attente",
      body: "Il sera relu.",
      excerpt: "Un extrait.",
      recordUrl: "https://cyberlearn.fr/settings/moderation",
      siteUrl: "https://cyberlearn.fr",
    }),
  ],
  [
    "account-deleted",
    AccountDeletedEmail({
      displayName: "Amélie",
      deletedAt: "19 septembre",
      contactEmail: "contact@cyberlearn.fr",
    }),
  ],
  [
    "account-deletion-confirm",
    AccountDeletionConfirmEmail({
      displayName: "Amélie",
      confirmUrl: "https://cyberlearn.fr/account/delete/confirm",
    }),
  ],
];

describe.each(RENDERED)("%s", (_name, element) => {
  it("has square corners, like the site", async () => {
    const html = await render(element);
    // The single loudest reason the mails did not look like the product: a
    // 12px card and an 8px button in a design whose dominant rule is 0.
    expect(html).not.toMatch(/border-radius/iu);
  });

  it("names the site's two typefaces and no others", async () => {
    const html = await render(element);
    expect(html).toContain("Plus Jakarta Sans");
    // Inter was named in every template and is used nowhere on the site.
    expect(html).not.toContain("Inter");
  });

  it("draws its card with the hairline the app draws panels with", async () => {
    const html = await render(element);
    expect(html.toUpperCase()).toContain(tokens.borderDefault);
  });

  it("emits no blanket font rule that would outrank inheritance", async () => {
    const html = await render(element);
    // react-email's <Font> ships `* { font-family: … }`. A universal selector
    // matches every element rather than setting a default, so it recaptured
    // the <span> react-email puts inside a <Button> and the link inside the
    // mono footer - both of which should inherit from their parent.
    expect(html).not.toMatch(/\*\s*\{[^}]*font-family/u);
  });

  it("loads both faces for the clients that honour a webfont", async () => {
    const html = await render(element);
    expect(html).toContain("@font-face");
    expect(html).toContain("JetBrains Mono");
  });
});

/** The first case, without an assertion the linter would rather see as `!`. */
function magicLinkElement(): React.ReactElement {
  const first = RENDERED[0];
  if (!first) throw new Error("no templates to render");
  return first[1];
}

describe("the mono reaches the places the site puts it", () => {
  it("sets it on the wordmark, the button and the footer", async () => {
    const html = await render(magicLinkElement());

    // Each of these carries the family itself rather than inheriting it: the
    // three that regressed were all cases of inheritance being cut.
    const monoRuns = html.match(/JetBrains Mono/gu) ?? [];
    // One @font-face, plus every element that names it.
    expect(monoRuns.length).toBeGreaterThanOrEqual(5);
  });

  it("leaves the body copy in the sans", async () => {
    const html = await render(magicLinkElement());
    const paragraph = html.slice(html.indexOf("Clique sur le bouton"));
    expect(paragraph.slice(0, 200)).not.toContain("JetBrains");
  });
});
