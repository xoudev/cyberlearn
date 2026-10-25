import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { certificateVerifyUrl } from "@cyberlearn/lib/social/portfolio";
import { PdfBastion, pdfBrand as brand } from "./brand";

const styles = StyleSheet.create({
  page: { backgroundColor: brand.paper, color: brand.ink, fontFamily: brand.text, padding: 36 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: brand.line,
  },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { fontFamily: brand.display, fontWeight: 600, fontSize: 25 },
  reference: { alignItems: "flex-end" },
  label: { color: brand.muted, fontSize: 9, marginBottom: 6 },
  code: { fontFamily: brand.display, fontWeight: 600, fontSize: 18, color: brand.copper },
  body: { paddingTop: 28, flex: 1 },
  kicker: { fontSize: 10, color: brand.copper, marginBottom: 12 },
  title: {
    fontFamily: brand.display,
    fontWeight: 600,
    fontSize: 46,
    lineHeight: 1,
    marginBottom: 18,
  },
  attest: { fontSize: 10, color: brand.muted, marginBottom: 5 },
  name: { fontFamily: brand.display, fontWeight: 600, fontSize: 32, lineHeight: 1.05 },
  handle: { fontSize: 10, color: brand.muted, marginTop: 5 },
  pathLabel: { fontSize: 10, color: brand.muted, marginTop: 18, marginBottom: 5 },
  pathTitle: {
    fontFamily: brand.display,
    fontWeight: 600,
    fontSize: 25,
    lineHeight: 1.08,
    color: brand.copper,
  },
  facts: { flexDirection: "row", backgroundColor: brand.carbon, padding: 16, marginTop: 22 },
  fact: { flex: 1 },
  factLabel: { color: "#C2BFB8", fontSize: 9, marginBottom: 7 },
  factValue: { color: "#F4F2ED", fontFamily: brand.display, fontWeight: 600, fontSize: 20 },
  factSmall: { color: "#C2BFB8", fontSize: 10, fontFamily: brand.text },
  footer: { flexDirection: "row", gap: 20, alignItems: "center", paddingTop: 18 },
  verification: { flex: 1 },
  footerTitle: { fontFamily: brand.display, fontWeight: 600, fontSize: 16, marginBottom: 5 },
  footerText: { fontSize: 8, color: brand.muted, lineHeight: 1.5 },
  address: { fontSize: 8, color: brand.copper, marginTop: 4 },
  qr: { width: 64, height: 64, backgroundColor: "#FFFFFF", padding: 4 },
});

export interface CertificateTemplateProps {
  displayName: string;
  username?: string | null;
  pathTitle: string;
  issuedAt: Date;
  publicId: string;
  score?: number | null;
  lessonCount: number;
  qrCodeDataUrl: string;
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
  const date = issuedAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const host = appUrl.replace(/^https?:\/\//, "");
  const code = certificateCode(publicId, issuedAt);
  const address = certificateVerifyUrl(appUrl, publicId).replace(/^https?:\/\//, "");
  return (
    <Document
      title={`Certificat · ${pathTitle}`}
      author="CyberLearn"
      subject={pathTitle}
      language="fr"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <View style={styles.wordmark}>
            <PdfBastion size={34} />
            <Text style={styles.brand}>
              CYBERLEARN<Text style={{ color: brand.copper }}>.</Text>
            </Text>
          </View>
          <View style={styles.reference}>
            <Text style={styles.label}>Certificat N°</Text>
            <Text style={styles.code}>{code}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.kicker}>Apprendre / Pratiquer / Accomplir</Text>
          <Text style={styles.title}>CERTIFICAT DE COMPLÉTION.</Text>
          <Text style={styles.attest}>Ce certificat atteste que</Text>
          <Text style={{ ...styles.name, fontSize: displayName.length > 45 ? 24 : 32 }}>
            {displayName}
          </Text>
          {username ? <Text style={styles.handle}>@{username}</Text> : null}
          <Text style={styles.pathLabel}>a complété le parcours</Text>
          <Text style={{ ...styles.pathTitle, fontSize: pathTitle.length > 85 ? 20 : 25 }}>
            {pathTitle}
          </Text>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Délivré le</Text>
              <Text style={styles.factValue}>{date}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Score final</Text>
              <Text style={styles.factValue}>
                {score ?? "-"}
                {score != null ? <Text style={styles.factSmall}> / 100</Text> : null}
              </Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Missions terminées</Text>
              <Text style={styles.factValue}>
                {lessonCount}
                <Text style={styles.factSmall}> / {lessonCount}</Text>
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.verification}>
            <Text style={styles.footerTitle}>Un parcours accompli. Une référence vérifiable.</Text>
            <Text style={styles.footerText}>
              Délivré par {host} · Scanner le QR code ou consulter le registre.
            </Text>
            <Text style={styles.address}>Vérifier : {address}</Text>
          </View>
          <Image src={qrCodeDataUrl} style={styles.qr} />
        </View>
      </Page>
    </Document>
  );
}
