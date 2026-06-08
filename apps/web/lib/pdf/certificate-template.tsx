import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_DATA_URL } from "./logo-data";

/**
 * Certificate PDF — reproduces the docs/design/paths/certificate.css visual
 * (landscape A4, dark on-brand theme, centered composition, double frame,
 * brand accent ribbon, meta row, QR + verification strip) within the
 * constraints of @react-pdf/renderer (no CSS gradients / clip-path / shadows →
 * approximated with solid brand colors and bordered Views; built-in Helvetica
 * to keep generation dependency-free).
 */

const INK = "#F3F2FA";
const INK2 = "#C3C0DC";
const INK_MUTED = "#8E8BB2";
const PAGE = "#07052A";
const LINE = "#2A2560";
const LINE_STRONG = "#3C3680";
const TURQ = "#0AFFD4";
const BLUE_LT = "#6EA8FF";

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAGE,
    fontFamily: "Helvetica",
    color: INK,
    position: "relative",
    padding: 22,
  },
  // brand accent ribbon along the top edge (gradient → solid turquoise)
  topbar: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: TURQ },
  // double frame
  frameOuter: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1,
    borderColor: LINE,
  },
  frameInner: {
    position: "absolute",
    top: 27,
    left: 27,
    right: 27,
    bottom: 27,
    borderWidth: 1,
    borderColor: "rgba(60,54,128,0.45)",
  },
  inner: {
    flex: 1,
    margin: 22,
    paddingHorizontal: 52,
    paddingTop: 34,
    paddingBottom: 26,
    flexDirection: "column",
  },

  // header
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandLogo: { width: 30, height: 30, objectFit: "contain", marginRight: 11 },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: -0.2, color: INK },
  brandTag: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: INK_MUTED,
    marginTop: 4,
  },
  idBox: { alignItems: "flex-end" },
  idLbl: { fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: INK_MUTED },
  idVal: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: TURQ,
    fontFamily: "Helvetica-Bold",
    marginTop: 5,
  },

  // body (centered)
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrowRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  eyebrowRule: { width: 30, height: 1.5, backgroundColor: TURQ },
  eyebrowText: {
    fontSize: 10,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: TURQ,
    fontFamily: "Helvetica-Bold",
    marginHorizontal: 13,
  },
  attest: { fontSize: 12, color: INK2 },
  name: {
    fontSize: 46,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -1.2,
    color: INK,
    marginTop: 10,
    marginBottom: 4,
  },
  handle: { fontSize: 11, letterSpacing: 0.8, color: TURQ, marginBottom: 22 },
  forLabel: { fontSize: 12, color: INK2, marginBottom: 8 },
  pathTitle: {
    fontSize: 27,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.5,
    color: BLUE_LT,
    textAlign: "center",
    marginBottom: 24,
  },

  // meta row
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: LINE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  metaCell: {
    paddingVertical: 11,
    paddingHorizontal: 26,
    borderRightWidth: 1,
    borderRightColor: LINE,
    alignItems: "center",
  },
  metaCellLast: { borderRightWidth: 0 },
  metaLbl: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: INK_MUTED,
    marginBottom: 6,
  },
  metaVal: { fontSize: 17, fontFamily: "Helvetica-Bold", letterSpacing: -0.2, color: INK },
  metaValSm: { fontSize: 10, color: INK_MUTED, fontFamily: "Helvetica" },

  // footer
  foot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 26,
  },
  sign: { alignItems: "center", width: 200 },
  signMark: { fontSize: 24, fontFamily: "Helvetica-Oblique", color: INK, marginBottom: 6 },
  signRule: { width: 160, height: 1, backgroundColor: LINE_STRONG, marginBottom: 8 },
  signRole: { fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: INK_MUTED },
  signRoleB: { color: INK2, fontFamily: "Helvetica-Bold" },

  emblem: { alignItems: "center", justifyContent: "flex-end" },
  emblemLogo: { width: 54, height: 54, objectFit: "contain" },
  qrBlock: { alignItems: "center" },
  qr: {
    width: 76,
    height: 76,
    backgroundColor: "#F4F5FA",
    borderWidth: 1,
    borderColor: LINE_STRONG,
    padding: 4,
  },
  qrCap: {
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: INK_MUTED,
    marginTop: 7,
  },

  // bottom verification strip
  strip: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  stripSeg: { flexDirection: "row", alignItems: "center" },
  stripText: { fontSize: 8.5, letterSpacing: 0.4, color: INK_MUTED },
  stripB: { color: INK2, fontFamily: "Helvetica-Bold" },
  stripUrl: { color: TURQ },
  stripDiv: { width: 1, height: 11, backgroundColor: LINE_STRONG, marginHorizontal: 12 },
});

export interface CertificateTemplateProps {
  displayName: string;
  username?: string | null;
  pathTitle: string;
  issuedAt: Date;
  publicId: string;
  /** Final exam score (%) — null for path-completion-only certs. */
  score?: number | null;
  /** Number of lessons (missions) in the path. */
  lessonCount: number;
  qrCodeDataUrl: string; // data:image/png;base64,... from qrcode library
  appUrl: string;
}

export function CertificateDocument({
  displayName,
  username,
  pathTitle,
  issuedAt,
  publicId,
  score,
  lessonCount,
  qrCodeDataUrl,
  appUrl,
}: CertificateTemplateProps): React.ReactElement {
  const dateStr = issuedAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const verifyHost = appUrl.replace(/^https?:\/\//, "");
  const certCode = `CL-${String(issuedAt.getFullYear())}-${publicId.slice(0, 6).toUpperCase()}`;

  return (
    <Document title={`Certificat · ${pathTitle}`} author="CyberLearn" subject={pathTitle}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topbar} fixed />
        <View style={styles.frameOuter} fixed />
        <View style={styles.frameInner} fixed />

        <View style={styles.inner}>
          {/* header */}
          <View style={styles.head}>
            <View style={styles.brandRow}>
              <Image src={LOGO_DATA_URL} style={styles.brandLogo} />
              <View>
                <Text style={styles.brandName}>
                  cyber<Text style={{ color: TURQ }}>learn</Text>
                </Text>
                <Text style={styles.brandTag}>Certificat de complétion</Text>
              </View>
            </View>
            <View style={styles.idBox}>
              <Text style={styles.idLbl}>Certificat N°</Text>
              <Text style={styles.idVal}>{certCode}</Text>
            </View>
          </View>

          {/* body */}
          <View style={styles.body}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowRule} />
              <Text style={styles.eyebrowText}>Certificat</Text>
              <View style={styles.eyebrowRule} />
            </View>

            <Text style={styles.attest}>Ce certificat atteste que</Text>
            <Text style={styles.name}>{displayName}</Text>
            {username != null && username !== "" && <Text style={styles.handle}>@{username}</Text>}

            <Text style={styles.forLabel}>Pour avoir complété le parcours</Text>
            <Text style={styles.pathTitle}>{pathTitle}</Text>

            {/* meta row */}
            <View style={styles.metaRow}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLbl}>Délivré le</Text>
                <Text style={styles.metaVal}>{dateStr}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLbl}>Score final</Text>
                <Text style={{ ...styles.metaVal, color: BLUE_LT }}>
                  {score ?? "—"}
                  {score != null && <Text style={styles.metaValSm}> / 100</Text>}
                </Text>
              </View>
              <View style={{ ...styles.metaCell, ...styles.metaCellLast }}>
                <Text style={styles.metaLbl}>Missions</Text>
                <Text style={styles.metaVal}>
                  {lessonCount}
                  <Text style={styles.metaValSm}> / {lessonCount}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* footer */}
          <View style={styles.foot}>
            <View style={styles.sign}>
              <Text style={styles.signMark}>Cyber Learn</Text>
              <View style={styles.signRule} />
              <Text style={styles.signRole}>
                Délivré par <Text style={styles.signRoleB}>{verifyHost}</Text>
              </Text>
            </View>

            <View style={styles.emblem}>
              <Image src={LOGO_DATA_URL} style={styles.emblemLogo} />
            </View>

            <View style={styles.qrBlock}>
              <Image src={qrCodeDataUrl} style={styles.qr} />
              <Text style={styles.qrCap}>Scanner pour vérifier</Text>
            </View>
          </View>

          {/* verification strip */}
          <View style={styles.strip}>
            <View style={styles.stripSeg}>
              <Text style={styles.stripText}>
                <Text style={styles.stripB}>Authentique</Text> · Signature SHA-256
              </Text>
            </View>
            <View style={styles.stripDiv} />
            <View style={styles.stripSeg}>
              <Text style={styles.stripText}>
                Vérifier :{" "}
                <Text style={styles.stripUrl}>
                  {verifyHost}/verify/{publicId.slice(0, 8)}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
