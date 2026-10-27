import { Head, Img, Section } from "@react-email/components";
import React from "react";
import { styles } from "./theme.js";

const ASSETS = "https://cyberlearn.fr/brand";
export const EMAIL_BRAND_IMAGE = `${ASSETS}/email-lockup.png`;

// Only font declarations: a universal font rule would override the button's descendants.
const FACES = `
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 300 700;
  mso-font-alt: 'Arial';
  src: url('${ASSETS}/fonts/SpaceGrotesk.ttf') format('truetype');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  mso-font-alt: 'Arial Narrow';
  src: url('${ASSETS}/fonts/BarlowCondensed-SemiBold.ttf') format('truetype');
}
`;

export function EmailHead(): React.ReactElement {
  return (
    <Head>
      <meta name="color-scheme" content="dark" />
      <meta name="supported-color-schemes" content="dark" />
      <style dangerouslySetInnerHTML={{ __html: FACES }} />
    </Head>
  );
}

export function EmailBrand(): React.ReactElement {
  return (
    <Section style={styles.logoSection}>
      <Img
        src={EMAIL_BRAND_IMAGE}
        alt="CYBERLEARN."
        width="200"
        height="40"
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      />
    </Section>
  );
}
