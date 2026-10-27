import path from "node:path";
import React from "react";
import { Font, Path, Svg } from "@react-pdf/renderer";
import { BASTION_MARK_PATHS } from "@/components/bastion-logo";

export const pdfBrand = {
  paper: "#EAE7DF",
  ink: "#141518",
  muted: "#55524D",
  line: "#BDBAB3",
  copper: "#923200",
  signal: "#FF6B2B",
  carbon: "#121418",
  display: "Barlow Condensed",
  text: "Space Grotesk",
} as const;

// Local fonts keep PDF generation independent of network access.
Font.register({
  family: pdfBrand.display,
  src: path.join(process.cwd(), "public/brand/fonts/BarlowCondensed-SemiBold.ttf"),
  fontWeight: 600,
});
Font.register({
  family: pdfBrand.text,
  src: path.join(process.cwd(), "public/brand/fonts/SpaceGrotesk.ttf"),
});

export function PdfBastion({ size = 32 }: { size?: number }): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={BASTION_MARK_PATHS.top} fill={pdfBrand.signal} />
      <Path d={BASTION_MARK_PATHS.left} fill={pdfBrand.ink} />
      <Path d={BASTION_MARK_PATHS.right} fill={pdfBrand.ink} />
      <Path d={BASTION_MARK_PATHS.core} fill={pdfBrand.signal} />
    </Svg>
  );
}
