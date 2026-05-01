import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#030219",
    fontFamily: "Helvetica",
    padding: 0,
    position: "relative",
  },
  // Corner bracket accents
  cornerTL: {
    position: "absolute",
    top: 28,
    left: 28,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: "#0AFFD4",
    borderLeftColor: "#0AFFD4",
  },
  cornerTR: {
    position: "absolute",
    top: 28,
    right: 28,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopColor: "#0AFFD4",
    borderRightColor: "#0AFFD4",
  },
  cornerBL: {
    position: "absolute",
    bottom: 28,
    left: 28,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomColor: "#0AFFD4",
    borderLeftColor: "#0AFFD4",
  },
  cornerBR: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: "#0AFFD4",
    borderRightColor: "#0AFFD4",
  },
  // Header bar
  headerBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#1F1B47",
    paddingHorizontal: 56,
    paddingVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: "#0AFFD4", fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  refCode: { color: "#3F3D5C", fontSize: 9, fontFamily: "Helvetica", letterSpacing: 1 },
  // Body
  body: { paddingHorizontal: 56, paddingTop: 52, flex: 1 },
  label: {
    color: "#3F3D5C",
    fontSize: 8,
    fontFamily: "Helvetica",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  certTitle: {
    color: "#F5F5FA",
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -1,
    marginBottom: 8,
  },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 40 },
  recipientLabel: {
    color: "#6B6890",
    fontSize: 9,
    fontFamily: "Helvetica",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  recipientName: {
    color: "#F5F5FA",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.5,
  },
  // Divider
  divider: { height: 1, backgroundColor: "#1F1B47", marginBottom: 40 },
  // Stats row
  statsRow: { flexDirection: "row", gap: 48, marginBottom: 48 },
  statItem: { flexDirection: "column" },
  statLabel: {
    color: "#3F3D5C",
    fontSize: 8,
    fontFamily: "Helvetica",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: { color: "#F5F5FA", fontSize: 18, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#1F1B47",
    paddingHorizontal: 56,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hashLabel: {
    color: "#3F3D5C",
    fontSize: 8,
    fontFamily: "Helvetica",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  hashValue: { color: "#6B6890", fontSize: 8, fontFamily: "Helvetica", letterSpacing: 0.5 },
  verifyLabel: {
    color: "#3F3D5C",
    fontSize: 8,
    fontFamily: "Helvetica",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  verifyUrl: { color: "#0AFFD4", fontSize: 8, fontFamily: "Helvetica" },
  qrContainer: { flexDirection: "column", alignItems: "center", gap: 4 },
  qrLabel: { color: "#3F3D5C", fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1 },
  accentLine: { width: 48, height: 2, backgroundColor: "#0AFFD4", marginBottom: 28 },
});

export interface CertificateTemplateProps {
  displayName: string;
  pathTitle: string;
  issuedAt: Date;
  publicId: string;
  sha256Hash: string;
  qrCodeDataUrl: string; // data:image/png;base64,... from qrcode library
  appUrl: string;
}

export function CertificateDocument({
  displayName,
  pathTitle,
  issuedAt,
  publicId,
  sha256Hash,
  qrCodeDataUrl,
  appUrl,
}: CertificateTemplateProps) {
  const dateStr = issuedAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const verifyUrl = `${appUrl}/verify/${publicId}`;
  const hashShort = `${sha256Hash.slice(0, 16)}…${sha256Hash.slice(-8)}`;

  return (
    <Document title={`Certificat — ${pathTitle}`} author="CyberLearn" subject={pathTitle}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Corner brackets */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.brand}>CYBERLEARN</Text>
          <Text style={styles.refCode}>CERT · {publicId.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.label}>// certificat d&apos;achèvement</Text>
          <Text style={styles.certTitle}>{pathTitle}</Text>
          <View style={styles.accentLine} />

          <Text style={styles.recipientLabel}>Décerné à</Text>
          <Text style={styles.recipientName}>{displayName}</Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Date d&apos;émission</Text>
              <Text style={styles.statValue}>{dateStr}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Statut</Text>
              <Text style={{ ...styles.statValue, color: "#0AFFD4" }}>Validé</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Vérification</Text>
              <Text
                style={{
                  ...styles.statValue,
                  fontSize: 13,
                  color: "#B8B5D1",
                  fontFamily: "Helvetica",
                }}
              >
                SHA-256 · Publique
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.hashLabel}>Empreinte SHA-256</Text>
            <Text style={styles.hashValue}>{hashShort}</Text>
            <Text style={[styles.verifyLabel, { marginTop: 10 }]}>Vérifier en ligne</Text>
            <Text style={styles.verifyUrl}>{verifyUrl}</Text>
          </View>
          <View style={styles.qrContainer}>
            <Image src={qrCodeDataUrl} style={{ width: 80, height: 80 }} />
            <Text style={styles.qrLabel}>SCANNER</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
