import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { sheetSummary, type RevisionSheet } from "@cyberlearn/lib/paths/sheet";

/**
 * The revision sheet as a PDF: portrait A4, light so it prints, the brand's
 * turquoise for the rule and the labels, one section per lesson with its
 * points. Built-in Helvetica, like the certificate, so nothing is fetched.
 */

const INK = "#14123A";
const INK_MUTED = "#5C5987";
const LINE = "#D9D7EA";
const TURQ = "#0AA88C";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    color: INK,
    fontSize: 10.5,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: TURQ },
  kicker: { fontSize: 8, letterSpacing: 1.6, color: TURQ, fontFamily: "Helvetica-Bold" },
  path: { fontSize: 11, color: INK_MUTED, marginTop: 6 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 4 },
  summary: { fontSize: 9.5, color: INK_MUTED, marginTop: 6 },
  rule: { height: 1, backgroundColor: LINE, marginTop: 14, marginBottom: 6 },
  section: { marginTop: 14 },
  lesson: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  point: { flexDirection: "row", marginBottom: 4 },
  dot: { width: 12, color: TURQ, fontFamily: "Helvetica-Bold" },
  text: { flex: 1, lineHeight: 1.45 },
  empty: { color: INK_MUTED, marginTop: 14 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: INK_MUTED,
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function SheetDocument({
  sheet,
  generatedAt,
}: {
  sheet: RevisionSheet;
  generatedAt: Date;
}): React.ReactElement {
  return (
    <Document
      title={`${sheet.pathTitle} : ${sheet.title}`}
      author="CyberLearn"
      subject="Fiche de révision"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar} fixed />
        <Text style={styles.kicker}>FICHE DE RÉVISION</Text>
        <Text style={styles.path}>{sheet.pathTitle}</Text>
        <Text style={styles.title}>{sheet.title}</Text>
        <Text style={styles.summary}>{sheetSummary(sheet)}</Text>
        <View style={styles.rule} />

        {sheet.sections.length === 0 ? (
          <Text style={styles.empty}>
            Aucune leçon de ce module n&apos;a encore de récapitulatif.
          </Text>
        ) : null}
        {sheet.sections.map((section, k) => (
          <View key={k} style={styles.section} wrap={false} minPresenceAhead={60}>
            <Text style={styles.lesson}>{section.lessonTitle}</Text>
            {section.points.map((point, p) => (
              <View key={p} style={styles.point}>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.text}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>CyberLearn · cyberlearn.fr · fiche générée le {formatDate(generatedAt)}</Text>
          <Text
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${String(pageNumber)} / ${String(totalPages)}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
