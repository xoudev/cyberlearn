import { Column, Head, Img, Row, Section, Text } from "@react-email/components";
import React from "react";
import { styles, tokens } from "./theme.js";

const ASSETS = "https://cyberlearn.fr/brand";

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
      <Row>
        <Column style={{ width: "48px", verticalAlign: "middle" }}>
          <Img src={`${ASSETS}/bastion-mark.png`} alt="" width="32" height="32" />
        </Column>
        <Column style={{ verticalAlign: "middle" }}>
          <Text style={styles.logoText}>
            CYBERLEARN<span style={{ color: tokens.brandBlue }}>.</span>
          </Text>
        </Column>
      </Row>
    </Section>
  );
}
