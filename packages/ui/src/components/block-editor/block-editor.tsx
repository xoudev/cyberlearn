"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  type ComponentBlock,
  type HeadingBlock,
  type LessonBlock,
  type TextBlock,
} from "@cyberlearn/lib/mdx-blocks";
import {
  guideUrl,
  LESSON_COMPONENT_FAMILIES,
  LESSON_COMPONENTS,
  lessonComponent,
} from "@cyberlearn/lib/mdx-components";
import { componentForm, FORM } from "@cyberlearn/lib/mdx-forms";
import { componentAccent } from "../mdx-guide-sections";
import { ComponentFormView } from "./component-form";
import {
  BORDER,
  DANGER,
  MONO,
  MUTED,
  SelectInput,
  SmallButton,
  TEXT,
  TextArea,
  TextInput,
} from "./fields";
import {
  blocksOf,
  componentErrors,
  insertAt,
  mdxOf,
  moveBy,
  newComponent,
  newHeading,
  newText,
  removeAt,
  replaceAt,
  takenIds,
  updateComponent,
  updateComponentSource,
  updateHeading,
  updateText,
  type EditorBlock,
} from "./model";

/**
 * A lesson as a column of blocks: headings, stretches of Markdown, and
 * components drawn as forms. The author adds a block where the "+" is, fills
 * its fields, moves it, removes it; the MDX is written after each change
 * (model.ts), so the preview and the save see what the blocks say.
 *
 * Controlled by the MDX itself: `value` in, `value` out. The list is cut
 * from `value` when it changes from outside (the code view, a guide insert)
 * and kept as is while the changes are this editor's own, so a keystroke in
 * a field never rebuilds the list under the author's cursor.
 */

export interface BlockEditorProps {
  value: string;
  onChange: (mdx: string) => void;
}

/**
 * A list of blocks held in state, cut from `source` when `source` changes
 * from outside, written back through `emit`. Shared by the lesson and by a
 * group's questions, which are a lesson in small.
 */
function useSyncedList(
  source: string,
  emit: (mdx: string) => void,
): [EditorBlock[], (next: EditorBlock[]) => void] {
  const [list, setList] = useState<EditorBlock[]>(() => blocksOf(source) ?? [newTextItem(source)]);
  const emitted = useRef(source);

  useEffect(() => {
    if (source === emitted.current) return;
    emitted.current = source;
    setList(blocksOf(source) ?? [newTextItem(source)]);
  }, [source]);

  const commit = (next: EditorBlock[]): void => {
    setList(next);
    const mdx = mdxOf(next);
    emitted.current = mdx;
    emit(mdx);
  };
  return [list, commit];
}

function newTextItem(source: string): EditorBlock {
  return { key: "raw", block: newText(source) };
}

export function BlockEditor({ value, onChange }: BlockEditorProps): React.ReactElement {
  const [list, commit] = useSyncedList(value, onChange);
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "10px 16px 48px",
        background: "#07051E",
        boxSizing: "border-box",
      }}
    >
      <BlockList list={list} onChange={commit} depth={0} />
    </div>
  );
}

// ── The list ───────────────────────────────────────────────────────────────────

function BlockList({
  list,
  onChange,
  allowed,
  depth,
}: {
  list: EditorBlock[];
  onChange: (next: EditorBlock[]) => void;
  /** The component names this list takes; every kind when absent. */
  allowed?: readonly string[] | undefined;
  depth: number;
}): React.ReactElement {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const taken = takenIds(list);

  const insert = (index: number, blocks: LessonBlock[]): void => {
    onChange(insertAt(list, index, blocks));
    setOpenAt(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {list.length === 0 && (
        <p style={{ margin: "8px 0", fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {depth === 0 ? "// une leçon vide : ajoute un premier bloc" : "// rien ici encore"}
        </p>
      )}
      <InsertPoint
        open={openAt === 0}
        onToggle={() => {
          setOpenAt(openAt === 0 ? null : 0);
        }}
        onPick={(blocks) => {
          insert(0, blocks);
        }}
        allowed={allowed}
        taken={taken}
      />
      {list.map((item, index) => (
        <React.Fragment key={item.key}>
          <BlockCard
            item={item}
            index={index}
            count={list.length}
            depth={depth}
            onChange={(block) => {
              onChange(replaceAt(list, index, block));
            }}
            onMove={(by) => {
              onChange(moveBy(list, index, by));
            }}
            onRemove={() => {
              onChange(removeAt(list, index));
            }}
          />
          <InsertPoint
            open={openAt === index + 1}
            onToggle={() => {
              setOpenAt(openAt === index + 1 ? null : index + 1);
            }}
            onPick={(blocks) => {
              insert(index + 1, blocks);
            }}
            allowed={allowed}
            taken={taken}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

function InsertPoint({
  open,
  onToggle,
  onPick,
  allowed,
  taken,
}: {
  open: boolean;
  onToggle: () => void;
  onPick: (blocks: LessonBlock[]) => void;
  allowed: readonly string[] | undefined;
  taken: ReadonlySet<string>;
}): React.ReactElement {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: open ? BORDER : "#15123A" }} />
        <button
          type="button"
          title={open ? "Fermer" : "Ajouter un bloc ici"}
          aria-label={open ? "Fermer" : "Ajouter un bloc ici"}
          aria-expanded={open}
          onClick={onToggle}
          style={{
            width: 22,
            height: 22,
            border: `1px solid ${open ? "var(--cosmetic-accent)" : BORDER}`,
            borderRadius: "50%",
            background: open
              ? "color-mix(in srgb, var(--cosmetic-accent) 12%, transparent)"
              : "#07051E",
            color: open ? "var(--cosmetic-accent)" : MUTED,
            fontFamily: MONO,
            fontSize: 13,
            lineHeight: 1,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {open ? "×" : "+"}
        </button>
        <div style={{ flex: 1, height: 1, background: open ? BORDER : "#15123A" }} />
      </div>
      {open && <InsertMenu allowed={allowed} taken={taken} onPick={onPick} />}
    </div>
  );
}

function InsertMenu({
  allowed,
  taken,
  onPick,
}: {
  allowed: readonly string[] | undefined;
  taken: ReadonlySet<string>;
  onPick: (blocks: LessonBlock[]) => void;
}): React.ReactElement {
  const pickComponent = (name: string): void => {
    const blocks = newComponent(name, taken);
    if (blocks) onPick(blocks);
  };
  const families = LESSON_COMPONENT_FAMILIES.map((family) => ({
    family,
    components: LESSON_COMPONENTS.filter(
      (spec) => spec.family === family.id && (allowed === undefined || allowed.includes(spec.name)),
    ),
  })).filter((group) => group.components.length > 0);

  return (
    <div
      role="menu"
      style={{
        margin: "6px 0 2px",
        padding: "10px 12px 12px",
        border: `1px solid ${BORDER}`,
        background: "var(--color-bg-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {allowed === undefined && (
        <MenuGroup title="Structure">
          <MenuButton
            title="Une section : un titre de niveau 2, une étape de la leçon"
            onClick={() => {
              onPick([newHeading(2, "Nouvelle section")]);
            }}
          >
            Section
          </MenuButton>
          <MenuButton
            title="Un sous-titre, niveau 3"
            onClick={() => {
              onPick([newHeading(3, "Sous-titre")]);
            }}
          >
            Sous-titre
          </MenuButton>
          <MenuButton
            title="Du texte en Markdown : paragraphes, listes, blocs de code"
            onClick={() => {
              onPick([newText("Un paragraphe.")]);
            }}
          >
            Texte
          </MenuButton>
        </MenuGroup>
      )}
      {families.map(({ family, components }) => (
        <MenuGroup key={family.id} title={family.label}>
          {components.map((spec) => (
            <MenuButton
              key={spec.name}
              title={spec.description}
              onClick={() => {
                pickComponent(spec.name);
              }}
              code={componentForm(spec.name) === undefined}
            >
              {spec.label}
            </MenuButton>
          ))}
        </MenuGroup>
      ))}
    </div>
  );
}

function MenuGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function MenuButton({
  children,
  title,
  onClick,
  code = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  /** The component has no form yet: it is edited as MDX. */
  code?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      title={code ? `${title} (se remplit en MDX pour l'instant)` : title}
      onClick={onClick}
      style={{
        height: 26,
        padding: "0 10px",
        border: `1px solid ${BORDER}`,
        background: "#07051E",
        color: TEXT,
        fontSize: 12,
        cursor: "pointer",
        borderRadius: 2,
      }}
    >
      {children}
      {code && (
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginLeft: 6 }}>MDX</span>
      )}
    </button>
  );
}

// ── One block ──────────────────────────────────────────────────────────────────

const DEPTHS = [
  { value: "1", label: "Titre" },
  { value: "2", label: "Section" },
  { value: "3", label: "Sous-section" },
];

function toDepth(value: string): HeadingBlock["depth"] {
  const n = Number(value);
  return (n >= 1 && n <= 6 ? n : 2) as HeadingBlock["depth"];
}

function BlockCard({
  item,
  index,
  count,
  depth,
  onChange,
  onMove,
  onRemove,
}: {
  item: EditorBlock;
  index: number;
  count: number;
  depth: number;
  onChange: (block: LessonBlock) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}): React.ReactElement {
  const { block } = item;
  const [showSource, setShowSource] = useState(false);
  const errors = block.kind === "component" ? componentErrors(block) : null;
  const errorCount = errors === null ? 0 : Object.keys(errors).length;
  const accent =
    block.kind === "heading"
      ? "var(--cosmetic-accent)"
      : block.kind === "text"
        ? "var(--color-text-faint)"
        : componentAccent(block.name);
  const label =
    block.kind === "heading"
      ? (DEPTHS.find((d) => d.value === String(block.depth))?.label ??
        `Titre ${String(block.depth)}`)
      : block.kind === "text"
        ? "Texte"
        : (lessonComponent(block.name)?.label ?? "Composant");

  return (
    <section
      aria-label={label}
      style={{
        border: `1px solid ${errorCount > 0 ? `${DANGER}66` : "var(--color-border-subtle)"}`,
        borderLeft: `3px solid ${errorCount > 0 ? DANGER : accent}`,
        background: "#060422",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px 6px 12px",
          borderBottom: "1px solid #15123A",
        }}
      >
        {block.kind === "component" && (
          <code style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: accent }}>
            &lt;{block.name}&gt;
          </code>
        )}
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          {label}
        </span>
        {errorCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: DANGER }}>
            {errorCount === 1 ? "1 champ à revoir" : `${String(errorCount)} champs à revoir`}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {block.kind === "component" && componentForm(block.name) !== undefined && (
            <SmallButton
              title={showSource ? "Masquer le MDX" : "Voir le MDX de ce bloc"}
              onClick={() => {
                setShowSource((v) => !v);
              }}
            >
              MDX
            </SmallButton>
          )}
          <SmallButton
            title="Monter"
            onClick={() => {
              onMove(-1);
            }}
            disabled={index === 0}
          >
            ↑
          </SmallButton>
          <SmallButton
            title="Descendre"
            onClick={() => {
              onMove(1);
            }}
            disabled={index === count - 1}
          >
            ↓
          </SmallButton>
          <SmallButton title="Retirer ce bloc" tone="danger" onClick={onRemove}>
            ✕
          </SmallButton>
        </span>
      </header>
      <div style={{ padding: "10px 12px 12px" }}>
        {errors?.[FORM] !== undefined && (
          <p
            role="alert"
            style={{
              margin: "0 0 10px",
              padding: "6px 10px",
              border: `1px solid ${DANGER}55`,
              background: "rgba(255,77,109,0.07)",
              fontFamily: MONO,
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "var(--color-text-primary)",
            }}
          >
            {errors[FORM]}
          </p>
        )}
        <BlockBody block={block} depth={depth} onChange={onChange} errors={errors} />
        {showSource && block.kind === "component" && (
          <pre
            style={{
              margin: "12px 0 0",
              padding: "8px 10px",
              background: "#07051E",
              border: `1px solid ${BORDER}`,
              fontFamily: MONO,
              fontSize: 11,
              color: "var(--color-text-secondary)",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {block.source}
          </pre>
        )}
      </div>
    </section>
  );
}

function BlockBody({
  block,
  depth,
  onChange,
  errors,
}: {
  block: LessonBlock;
  depth: number;
  onChange: (block: LessonBlock) => void;
  errors: Record<string, string> | null;
}): React.ReactElement {
  if (block.kind === "heading") return <HeadingBody block={block} onChange={onChange} />;
  if (block.kind === "text") return <TextBody block={block} onChange={onChange} />;
  const form = componentForm(block.name);
  if (!form) return <SourceBody block={block} onChange={onChange} />;
  return (
    <ComponentFormView
      block={block}
      form={form}
      errors={errors ?? {}}
      onChange={(attrs, inner) => {
        onChange(updateComponent(block, attrs, inner));
      }}
      nested={(inner, allowed, onInnerChange) => (
        <NestedBlocks inner={inner} allowed={allowed} depth={depth + 1} onChange={onInnerChange} />
      )}
    />
  );
}

function HeadingBody({
  block,
  onChange,
}: {
  block: HeadingBlock;
  onChange: (block: LessonBlock) => void;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <SelectInput
        value={String(block.depth)}
        options={
          DEPTHS.some((d) => d.value === String(block.depth))
            ? DEPTHS
            : [...DEPTHS, { value: String(block.depth), label: `Niveau ${String(block.depth)}` }]
        }
        ariaLabel="Niveau du titre"
        onChange={(value) => {
          onChange(updateHeading(block, { depth: toDepth(value) }));
        }}
      />
      <TextInput
        value={block.text}
        ariaLabel="Texte du titre"
        placeholder="Le titre"
        onChange={(text) => {
          onChange(updateHeading(block, { text }));
        }}
      />
    </div>
  );
}

function TextBody({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (block: LessonBlock) => void;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <TextArea
        value={block.source}
        rows={3}
        ariaLabel="Texte"
        placeholder="Du Markdown : paragraphes, listes, tableaux, blocs de code…"
        onChange={(source) => {
          onChange(updateText(block, source));
        }}
      />
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#5A5785" }}>
        Markdown : **gras**, *italique*, `code`, - liste, ```langage pour un bloc de code.
      </span>
    </div>
  );
}

/** A component without a form yet, or one the lesson does not know: its MDX, as is. */
function SourceBody({
  block,
  onChange,
}: {
  block: ComponentBlock;
  onChange: (block: LessonBlock) => void;
}): React.ReactElement {
  const spec = lessonComponent(block.name);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <TextArea
        value={block.source}
        mono
        rows={4}
        ariaLabel={`MDX du composant ${block.name}`}
        onChange={(source) => {
          onChange(updateComponentSource(block, source));
        }}
      />
      {spec ? (
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#5A5785" }}>
          {spec.description}{" "}
          <a
            href={guideUrl(spec)}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--cosmetic-accent)" }}
          >
            Sa section du guide ↗
          </a>
        </span>
      ) : (
        <span role="alert" style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>
          Composant inconnu de la leçon : il ne sera pas rendu.
        </span>
      )}
    </div>
  );
}

/** A group's questions: the blocks between its tags, edited like the lesson's. */
function NestedBlocks({
  inner,
  allowed,
  depth,
  onChange,
}: {
  inner: string | null;
  allowed: readonly string[];
  depth: number;
  onChange: (inner: string | null) => void;
}): React.ReactElement {
  const [list, commit] = useSyncedList(inner ?? "", (mdx) => {
    onChange(mdx.trim() === "" ? null : mdx.trimEnd());
  });
  return (
    <div style={{ paddingLeft: 10, borderLeft: `1px dashed ${BORDER}` }}>
      <BlockList list={list} onChange={commit} allowed={allowed} depth={depth} />
    </div>
  );
}
