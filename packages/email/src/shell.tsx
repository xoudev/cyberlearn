import { Head } from "@react-email/components";
import React from "react";

/**
 * The head every mail shares, which exists to carry the two typefaces.
 *
 * Naming Plus Jakarta Sans and JetBrains Mono in a font stack only helps the
 * handful of readers who happen to have them installed. Declaring them makes
 * the mail look like the site in every client that honours a webfont - Apple
 * Mail, Thunderbird, most desktop readers - and costs nothing in the ones that
 * do not: Gmail strips the rule and falls through to the same stack it would
 * have used anyway.
 *
 * Written out rather than built with react-email's <Font>, which was tried
 * first. That component emits its @font-face *and* a blanket
 * `* { font-family: … }`, and a universal selector does not set a default - it
 * matches every element, which beats inheritance. Three consequences, all of
 * them seen in the rendered output:
 *
 *   the last <Font> won the blanket rule, so declaring the mono last put every
 *   paragraph in JetBrains Mono;
 *   with the sans declared last instead, the mono stopped reaching anything it
 *   was not named on directly - react-email's <Button> wraps its label in a
 *   <span> of its own, and the blanket rule recaptured that span even though
 *   its parent <a> is mono;
 *   the footer's link went the same way, inside a footer that is mono.
 *
 * Only @font-face is emitted here. The body font then comes from styles.main
 * on <Body> and reaches everything by inheritance, which is what a font stack
 * is for, and the mono reaches its handful of places by being named on them.
 */

const JAKARTA =
  "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU79PDGg.woff2";
const JETBRAINS =
  "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2";

/**
 * mso-font-alt is what Outlook reads instead of the webfont, so each face
 * names the family it should fall back to there.
 */
const FACES = `
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 400;
  mso-font-alt: 'Helvetica';
  src: url(${JAKARTA}) format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 800;
  mso-font-alt: 'Helvetica';
  src: url(${JAKARTA}) format('woff2');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  mso-font-alt: 'Courier New';
  src: url(${JETBRAINS}) format('woff2');
}
`;

export function EmailHead(): React.ReactElement {
  return (
    <Head>
      {/* The only way to put a style block in a mail's head from JSX. The
          content is a constant above, never interpolated from anything. */}
      <style dangerouslySetInnerHTML={{ __html: FACES }} />
    </Head>
  );
}

/** Re-exported so a template imports its chrome and its styles from one place. */
