import path from "node:path";
import React from "react";
import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  CALLOUT_LABELS,
  parseRichMarkdown,
  type CalloutKind,
  type NoteColor,
  type RichBlock,
  type RichInline,
  type RichList,
} from "@cyberlearn/lib/notes/rich-markdown";
import { CODE_SCOPE_COLORS, highlightLines } from "@/lib/notes/highlight";
import { PdfBastion, pdfBrand as brand } from "./brand";

/**
 * The notes as a PDF: portrait A4, light so it prints, each note on its own
 * page under the brand's bar, with the workspace's markdown drawn natively -
 * headings in Barlow Condensed, text in Space Grotesk, code in JetBrains Mono
 * on a numbered, coloured block with its language, callouts, tables, task
 * boxes, colours and flashcards. Several notes get a cover with their table of
 * contents, each entry a link to its note. Local fonts only (public/brand/fonts).
 */

const FONTS = path.join(process.cwd(), "public/brand/fonts");
const TEXT = "Notes Text";
const MONO = "Notes Mono";
/**
 * JetBrains Mono draws `==`, `->`, `!=`… as ligatures, and fontkit cannot
 * subset those glyphs ("Offset is outside the bounds of the DataView"): code
 * in the PDF is set without them, each character as typed.
 */
const NO_LIGATURES = { calt: false, liga: false, dlig: false };
/** A4 portrait, in points. */
const A4_HEIGHT = 841.89;

Font.register({
  family: TEXT,
  fonts: [
    { src: path.join(FONTS, "SpaceGrotesk-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "SpaceGrotesk-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: MONO,
  fonts: [
    { src: path.join(FONTS, "JetBrainsMono-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "JetBrainsMono-Bold.ttf"), fontWeight: 700 },
    { src: path.join(FONTS, "JetBrainsMono-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
  ],
});
Font.register({
  family: "Notes Display",
  src: path.join(FONTS, "BarlowCondensed-Bold.ttf"),
  fontWeight: 700,
});
// French reads better unbroken than cut by an English hyphenation table.
Font.registerHyphenationCallback((word) => [word]);

const INK = brand.ink;
const BODY = "#2B2A27";
const MUTED = brand.muted;
const LINE = brand.line;
const ACCENT = brand.copper;
const SOFT = "#F5F3EE";

/** Colours of text and highlights on paper: the screen's hues, darker for print. */
const PRINT_FG: Record<NoteColor, string> = {
  rouge: "#C62E3A",
  orange: "#C25A12",
  jaune: "#8F6A00",
  vert: "#1E7F4F",
  bleu: "#1F5FA8",
  violet: "#6E3BB0",
  gris: "#6B6862",
};
const PRINT_BG: Record<NoteColor, string> = {
  rouge: "#FAD7DA",
  orange: "#FCE0CB",
  jaune: "#FBEFB8",
  vert: "#D2F1E0",
  bleu: "#D5E6FA",
  violet: "#E7DBFA",
  gris: "#E6E4DF",
};
const CALLOUT_COLOR: Record<CalloutKind, NoteColor> = {
  note: "bleu",
  info: "bleu",
  astuce: "vert",
  attention: "orange",
  danger: "rouge",
  succes: "vert",
  question: "violet",
  exemple: "gris",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: TEXT,
    color: BODY,
    fontSize: 10.5,
    lineHeight: 1.5,
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: ACCENT },
  brandRow: {
    position: "absolute",
    top: 22,
    left: 52,
    right: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { fontFamily: brand.display, fontWeight: 600, fontSize: 17, color: INK },
  brandRight: { fontSize: 8, color: MUTED, letterSpacing: 1 },
  // Placed from the top: with page breaks inside the content, `bottom` is
  // measured against the content's whole height and lands off the page.
  footer: {
    position: "absolute",
    top: A4_HEIGHT - 44,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 6,
  },

  coverKicker: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 2,
    marginTop: 40,
  },
  coverTitle: {
    fontFamily: "Notes Display",
    fontWeight: 700,
    fontSize: 46,
    lineHeight: 1.05,
    color: INK,
    marginTop: 10,
    textTransform: "uppercase",
  },
  coverSummary: { fontSize: 11, color: MUTED, marginTop: 10 },
  tocTitle: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 8.5,
    color: ACCENT,
    letterSpacing: 1.5,
    marginTop: 34,
    marginBottom: 8,
  },
  tocGroup: { fontWeight: 700, fontSize: 10, color: INK, marginTop: 10, marginBottom: 2 },
  tocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E4E1DA",
  },
  tocLink: { color: BODY, textDecoration: "none", fontSize: 10 },
  tocMeta: { fontSize: 8, color: MUTED },

  noteKicker: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  noteTitle: {
    fontFamily: "Notes Display",
    fontWeight: 700,
    fontSize: 30,
    lineHeight: 1.08,
    color: INK,
    marginTop: 4,
  },
  noteMeta: { fontSize: 8.5, color: MUTED, marginTop: 6 },
  rule: { height: 2, backgroundColor: ACCENT, width: 48, marginTop: 12, marginBottom: 16 },

  h1: {
    fontFamily: "Notes Display",
    fontWeight: 700,
    fontSize: 21,
    lineHeight: 1.25,
    color: INK,
    marginTop: 14,
    marginBottom: 8,
  },
  h2: {
    fontFamily: "Notes Display",
    fontWeight: 700,
    fontSize: 16.5,
    lineHeight: 1.3,
    color: INK,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: LINE,
  },
  h3: {
    fontFamily: "Notes Display",
    fontWeight: 700,
    fontSize: 13.5,
    lineHeight: 1.3,
    color: INK,
    marginTop: 10,
    marginBottom: 4,
  },
  h4: { fontWeight: 700, fontSize: 11, color: INK, marginTop: 8, marginBottom: 2 },
  para: { marginBottom: 7 },
  strong: { fontWeight: 700, color: INK },
  em: { color: MUTED },
  strike: { textDecoration: "line-through", color: MUTED },
  code: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 9,
    backgroundColor: "#EFECE5",
    color: "#8C3A10",
  },
  link: { color: ACCENT, textDecoration: "underline" },
  wiki: { color: ACCENT },
  hr: { height: 0.75, backgroundColor: LINE, marginVertical: 12 },

  list: { marginBottom: 7 },
  item: { flexDirection: "row", marginBottom: 2.5 },
  bullet: {
    width: 14,
    color: ACCENT,
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 8,
    paddingTop: 1.5,
  },
  number: { width: 18, color: ACCENT, fontWeight: 700, fontSize: 9.5 },
  box: { width: 8, height: 8, borderWidth: 1, borderColor: MUTED, marginTop: 3.2, marginRight: 6 },
  boxDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  itemBody: { flex: 1 },
  done: { color: MUTED, textDecoration: "line-through" },

  quote: {
    borderLeftWidth: 2.5,
    borderLeftColor: LINE,
    paddingLeft: 10,
    marginBottom: 8,
    color: MUTED,
  },
  callout: { borderLeftWidth: 3, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 9 },
  calloutTitle: {
    fontWeight: 700,
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  table: { borderWidth: 0.75, borderColor: LINE, marginBottom: 9 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE },
  th: { flex: 1, padding: 5, backgroundColor: SOFT, fontWeight: 700, color: INK, fontSize: 9.5 },
  td: { flex: 1, padding: 5, fontSize: 9.5 },

  card: {
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: LINE,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    padding: 8,
    marginBottom: 7,
    backgroundColor: SOFT,
  },
  cardLabel: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 7,
    color: ACCENT,
    letterSpacing: 1,
    width: 42,
    marginTop: 1.5,
  },
  cardFront: { fontWeight: 700, color: INK },
  cardBack: { color: MUTED, marginTop: 1 },

  codeBlock: { borderWidth: 0.75, borderColor: "#D9D5CC", marginBottom: 10 },
  codeBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ECE9E2",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#D9D5CC",
  },
  codeLang: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontWeight: 700,
    fontSize: 7,
    color: ACCENT,
    letterSpacing: 1.2,
  },
  codeDots: { fontFamily: MONO, fontFeatureSettings: NO_LIGATURES, fontSize: 7, color: "#B7B3AA" },
  codeBody: { backgroundColor: "#FAF9F6", paddingVertical: 6 },
  codeLine: { flexDirection: "row" },
  codeNum: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 7.5,
    color: "#B7B3AA",
    width: 26,
    textAlign: "right",
    paddingRight: 8,
    paddingTop: 0.8,
  },
  codeText: {
    fontFamily: MONO,
    fontFeatureSettings: NO_LIGATURES,
    fontSize: 8.4,
    color: "#2B2A27",
    flex: 1,
    lineHeight: 1.45,
    paddingRight: 8,
  },
});

export interface PdfNote {
  id: string;
  title: string;
  /** Its folders, root first. */
  breadcrumb: string[];
  /** One line under the title: lesson, path, date. */
  meta: string;
  content: string;
}

interface Ctx {
  /** Titles (folded) of the notes in this document → their anchor. */
  anchors: Map<string, string>;
}

const fold = (t: string): string =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function inline(nodes: readonly RichInline[], ctx: Ctx, key: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}-${String(i)}`;
    switch (node.kind) {
      case "text":
        return node.text;
      case "code":
        return (
          <Text key={k} style={s.code}>
            {` ${node.text} `}
          </Text>
        );
      case "strong":
        return (
          <Text key={k} style={s.strong}>
            {inline(node.children, ctx, k)}
          </Text>
        );
      case "em":
        return (
          <Text key={k} style={s.em}>
            {inline(node.children, ctx, k)}
          </Text>
        );
      case "strike":
        return (
          <Text key={k} style={s.strike}>
            {inline(node.children, ctx, k)}
          </Text>
        );
      case "mark":
        return (
          <Text
            key={k}
            style={
              node.background
                ? { backgroundColor: PRINT_BG[node.color] }
                : { color: PRINT_FG[node.color], fontWeight: 700 }
            }
          >
            {inline(node.children, ctx, k)}
          </Text>
        );
      case "link":
        return (
          <Link key={k} src={node.href} style={s.link}>
            {inline(node.children, ctx, k)}
          </Link>
        );
      case "wikilink": {
        const anchor = ctx.anchors.get(fold(node.target));
        return anchor ? (
          <Link key={k} src={`#${anchor}`} style={s.wiki}>
            {`↗ ${node.label}`}
          </Link>
        ) : (
          <Text key={k} style={s.wiki}>
            {node.label}
          </Text>
        );
      }
    }
  });
}

function list(block: RichList, ctx: Ctx, key: string, depth: number): React.ReactElement {
  return (
    <View key={key} style={[s.list, depth > 0 ? { marginLeft: 14, marginBottom: 0 } : {}]}>
      {block.items.map((item, i) => {
        const k = `${key}-${String(i)}`;
        const marker =
          item.checked !== null ? (
            <View style={[s.box, item.checked ? s.boxDone : {}]} />
          ) : block.ordered ? (
            <Text style={s.number}>{`${String(block.start + i)}.`}</Text>
          ) : (
            <Text style={s.bullet}>{depth === 0 ? "■" : "▪"}</Text>
          );
        return (
          <View key={k} wrap={false}>
            <View style={s.item}>
              {marker}
              <Text style={[s.itemBody, item.checked ? s.done : {}]}>
                {inline(item.children, ctx, k)}
              </Text>
            </View>
            {item.sublist ? list(item.sublist, ctx, `${k}-s`, depth + 1) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The PDF collapses runs of spaces, which would flatten indented code: leading
 * spaces, and every space of a run but the last, become no-break spaces. A
 * single space between words stays breakable, so a long line still wraps.
 */
function keepSpaces(text: string): string {
  return text
    .replace(/^ +/, (m) => "\u00a0".repeat(m.length))
    .replace(/ {2,}/g, (m) => `${"\u00a0".repeat(m.length - 1)} `);
}

function codeBlock(lang: string, code: string, key: string): React.ReactElement {
  const lines = highlightLines(code.replace(/\t/g, "    "), lang).map((line) => {
    // Leading spaces live in the first token(s): rebuild the line's start.
    let atStart = true;
    return line.map((t) => {
      const text = atStart
        ? keepSpaces(t.text)
        : t.text.replace(/ {2,}/g, (m) => `${"\u00a0".repeat(m.length - 1)} `);
      if (t.text.trim() !== "") atStart = false;
      return { ...t, text };
    });
  });
  return (
    <View key={key} style={s.codeBlock}>
      <View style={s.codeBar} wrap={false}>
        <Text style={s.codeLang}>{(lang || "code").toUpperCase()}</Text>
        <Text
          style={s.codeDots}
        >{`${String(lines.length)} ligne${lines.length > 1 ? "s" : ""}`}</Text>
      </View>
      <View style={s.codeBody}>
        {lines.map((line, i) => (
          <View key={`${key}-${String(i)}`} style={s.codeLine} wrap={false}>
            <Text style={s.codeNum}>{String(i + 1)}</Text>
            <Text style={s.codeText}>
              {line.length === 0
                ? " "
                : line.map((t, j) =>
                    t.scope ? (
                      <Text
                        key={`${key}-${String(i)}-${String(j)}`}
                        style={{
                          color: CODE_SCOPE_COLORS[t.scope],
                          fontStyle: t.scope === "comment" ? "italic" : "normal",
                          fontWeight: t.scope === "keyword" ? 700 : 400,
                        }}
                      >
                        {t.text}
                      </Text>
                    ) : (
                      t.text
                    ),
                  )}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function block(b: RichBlock, ctx: Ctx, key: string): React.ReactElement {
  switch (b.kind) {
    case "code":
      return codeBlock(b.lang, b.text, key);
    case "hr":
      return <View key={key} style={s.hr} />;
    case "heading": {
      const style = b.level === 1 ? s.h1 : b.level === 2 ? s.h2 : b.level === 3 ? s.h3 : s.h4;
      return (
        <Text key={key} style={style} minPresenceAhead={40}>
          {inline(b.children, ctx, key)}
        </Text>
      );
    }
    case "quote":
      return (
        <View key={key} style={s.quote}>
          <Text>
            {b.lines.flatMap((l, i) => [
              ...(i > 0 ? ["\n"] : []),
              ...inline(l, ctx, `${key}-${String(i)}`),
            ])}
          </Text>
        </View>
      );
    case "callout": {
      const color = CALLOUT_COLOR[b.variant];
      return (
        <View
          key={key}
          style={[
            s.callout,
            { borderLeftColor: PRINT_FG[color], backgroundColor: PRINT_BG[color] },
          ]}
          wrap={false}
        >
          <Text style={[s.calloutTitle, { color: PRINT_FG[color] }]}>
            {b.title.length > 0 ? inline(b.title, ctx, `${key}-t`) : CALLOUT_LABELS[b.variant]}
          </Text>
          {b.lines.length > 0 ? (
            <Text>
              {b.lines.flatMap((l, i) => [
                ...(i > 0 ? ["\n"] : []),
                ...inline(l, ctx, `${key}-${String(i)}`),
              ])}
            </Text>
          ) : null}
        </View>
      );
    }
    case "list":
      return list(b, ctx, key, 0);
    case "table":
      return (
        <View key={key} style={s.table}>
          <View style={s.tr} wrap={false}>
            {b.header.map((cell, c) => (
              <Text
                key={`${key}-h${String(c)}`}
                style={[s.th, { textAlign: b.align[c] ?? "left" }]}
              >
                {inline(cell, ctx, `${key}-h${String(c)}`)}
              </Text>
            ))}
          </View>
          {b.rows.map((row, r) => (
            <View key={`${key}-r${String(r)}`} style={s.tr} wrap={false}>
              {row.map((cell, c) => (
                <Text
                  key={`${key}-r${String(r)}c${String(c)}`}
                  style={[s.td, { textAlign: b.align[c] ?? "left" }]}
                >
                  {inline(cell, ctx, `${key}-r${String(r)}c${String(c)}`)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "flashcard":
      return (
        <View key={key} style={s.card} wrap={false}>
          <Text style={s.cardLabel}>CARTE</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardFront}>{inline(b.front, ctx, `${key}-f`)}</Text>
            <Text style={s.cardBack}>{inline(b.back, ctx, `${key}-b`)}</Text>
          </View>
        </View>
      );
    case "paragraph":
      return (
        <Text key={key} style={s.para}>
          {b.lines.flatMap((l, i) => [
            ...(i > 0 ? ["\n"] : []),
            ...inline(l, ctx, `${key}-${String(i)}`),
          ])}
        </Text>
      );
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const anchorOf = (id: string): string => `note-${id}`;

export function NotesDocument({
  title,
  notes,
  folderCount,
  generatedAt,
}: {
  /** The document's title: the note's, the folder's, or "Toutes mes notes". */
  title: string;
  notes: readonly PdfNote[];
  folderCount: number;
  generatedAt: Date;
}): React.ReactElement {
  const single = notes.length === 1;
  const ctx: Ctx = { anchors: new Map(notes.map((n) => [fold(n.title), anchorOf(n.id)])) };
  const groups = new Map<string, PdfNote[]>();
  for (const n of notes) {
    const g = n.breadcrumb.join(" / ");
    groups.set(g, [...(groups.get(g) ?? []), n]);
  }

  return (
    <Document
      title={title}
      author="CyberLearn"
      subject="Bloc-notes"
      creator="CyberLearn"
      language="fr"
    >
      <Page size="A4" style={s.page}>
        <View style={s.topbar} fixed />
        <View style={s.brandRow} fixed>
          <View style={s.brandLeft}>
            <PdfBastion size={22} />
            <Text style={s.wordmark}>CYBERLEARN.</Text>
          </View>
          <Text style={s.brandRight}>BLOC-NOTES</Text>
        </View>
        {/* Fixed elements repeat only on the pages after where they are
            declared: the footer goes before the notes and their page breaks. */}
        <View style={s.footer} fixed>
          <Text>{`CyberLearn · bloc-notes · ${formatDate(generatedAt)}`}</Text>
          <Text
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${String(pageNumber)} / ${String(totalPages)}`
            }
          />
        </View>

        {single ? null : (
          <View>
            <Text style={s.coverKicker}>BLOC-NOTES · EXPORT</Text>
            <Text style={s.coverTitle}>{title}</Text>
            <Text style={s.coverSummary}>
              {`${String(notes.length)} note${notes.length > 1 ? "s" : ""}`}
              {folderCount > 0
                ? ` · ${String(folderCount)} dossier${folderCount > 1 ? "s" : ""}`
                : ""}
              {` · exporté le ${formatDate(generatedAt)}`}
            </Text>
            <Text style={s.tocTitle}>SOMMAIRE</Text>
            {[...groups.entries()].map(([group, list]) => (
              <View key={`toc-${group}`}>
                {group ? <Text style={s.tocGroup}>{group}</Text> : null}
                {list.map((n) => (
                  <View key={`toc-${n.id}`} style={s.tocRow} wrap={false}>
                    <Link src={`#${anchorOf(n.id)}`} style={s.tocLink}>
                      {n.title}
                    </Link>
                    <Text style={s.tocMeta}>{n.meta.split(" · ").slice(-1)[0] ?? ""}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {notes.map((n, i) => (
          <View key={n.id} id={anchorOf(n.id)} break={!single || i > 0}>
            {n.breadcrumb.length > 0 ? (
              <Text style={s.noteKicker}>{n.breadcrumb.join("  /  ")}</Text>
            ) : null}
            <Text style={s.noteTitle}>{n.title}</Text>
            {n.meta ? <Text style={s.noteMeta}>{n.meta}</Text> : null}
            <View style={s.rule} />
            {parseRichMarkdown(n.content).map((b, j) => block(b, ctx, `${n.id}-${String(j)}`))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
