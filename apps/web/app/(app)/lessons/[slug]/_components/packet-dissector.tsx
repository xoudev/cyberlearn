"use client";

import React, { useState } from "react";
import {
  buildFrame,
  fieldAt,
  hexOf,
  LAYER_NAMES,
  type PacketField,
  type PacketLayer,
} from "@cyberlearn/lib/network/packet";
import { parsePacketDissector } from "@cyberlearn/types";

/**
 * <PacketDissector>: a frame as a hex dump, where a click on a byte says which
 * field it belongs to, what it is worth and what it is for. Client-side
 * because it answers clicks; nothing is sent anywhere.
 *
 * With `find`, the lesson asks for fields one at a time: the learner clicks a
 * byte of each. A wrong byte still names its own field, so a miss teaches too.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";
const BYTES_PER_ROW = 16;

const LAYER_COLORS: Record<PacketLayer, string> = {
  eth: "#4D8BFF",
  arp: "#0AFFD4",
  ip: "#0AFFD4",
  tcp: "#FFB020",
  udp: "#FFB020",
  icmp: "#FFB020",
  payload: "#FF6BCB",
  padding: "#7F7BA9",
  fcs: "#B8B5D1",
};

const tint = (layer: PacketLayer, strength: number): string =>
  `color-mix(in srgb, ${LAYER_COLORS[layer]} ${String(strength)}%, transparent)`;

/** The printable character of a byte, as the right-hand column of a dump shows it. */
const ascii = (byte: number): string =>
  byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ".";

const range = (field: PacketField): string =>
  field.length === 1
    ? `octet ${String(field.offset)}`
    : `octets ${String(field.offset)} à ${String(field.offset + field.length - 1)} (${String(field.length)})`;

export function PacketDissector(props: Record<string, unknown>): React.ReactElement {
  const parsed = parsePacketDissector(props);
  const [selected, setSelected] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "#B8B5D1",
          fontSize: 14,
        }}
      >
        Exercice « Décortiquer un paquet » indisponible : {parsed.problem}
      </div>
    );
  }
  const dissector = parsed.value;
  const frame = buildFrame(dissector.frame);
  const hex = hexOf(frame.bytes);
  const field = selected === null ? undefined : fieldAt(frame, selected);
  const toFind = (dissector.find ?? [])
    .map((id) => frame.fields.find((f) => f.id === id))
    .filter((f): f is PacketField => f !== undefined);
  const target = toFind.find((f) => !found.includes(f.id));
  const done = toFind.length > 0 && target === undefined;

  const pick = (offset: number): void => {
    setSelected(offset);
    const clicked = fieldAt(frame, offset);
    if (clicked === undefined || target === undefined) return;
    if (clicked.id === target.id) {
      setFound([...found, clicked.id]);
      setMiss(null);
    } else {
      setMiss(`Non : ces octets sont « ${clicked.name} » (${LAYER_NAMES[clicked.layer]}).`);
    }
  };

  const rows: number[][] = [];
  for (let at = 0; at < frame.bytes.length; at += BYTES_PER_ROW) {
    rows.push(
      Array.from({ length: Math.min(BYTES_PER_ROW, frame.bytes.length - at) }, (_, i) => at + i),
    );
  }

  return (
    <section
      aria-label={`Décortiquer un paquet${dissector.title ? ` : ${dissector.title}` : ""}`}
      style={{
        margin: "28px 0",
        border: "1px solid #1F1B47",
        borderTop: `2px solid ${ACCENT}`,
        background: "#05041A",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          DÉCORTIQUER UN PAQUET
        </span>
        {dissector.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{dissector.title}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
          {String(frame.bytes.length)} octets
        </span>
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        {dissector.task ? (
          <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{dissector.task}</p>
        ) : null}

        <div
          role="group"
          aria-label="Couches"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {frame.layers.map((span) => (
            <button
              key={`${span.layer}-${String(span.offset)}`}
              type="button"
              onClick={() => {
                setSelected(span.offset);
                setMiss(null);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                border: `1px solid ${LAYER_COLORS[span.layer]}`,
                background: tint(span.layer, 14),
                color: "#F5F5FA",
                fontFamily: MONO,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {LAYER_NAMES[span.layer]}
              <span style={{ color: "#7F7BA9" }}>{String(span.length)} o</span>
            </button>
          ))}
        </div>

        <div
          role="grid"
          aria-label="Octets de la trame"
          style={{ overflowX: "auto", background: "#0A0826", border: "1px solid #1F1B47" }}
        >
          <div style={{ display: "grid", gap: 2, padding: "8px 10px", minWidth: "max-content" }}>
            {rows.map((row) => (
              <div
                key={row[0]}
                role="row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: MONO,
                  fontSize: 13,
                }}
              >
                <span aria-hidden="true" style={{ color: "#3F3D5C", width: 36 }}>
                  {(row[0] ?? 0).toString(16).padStart(4, "0")}
                </span>
                <span role="presentation" style={{ display: "flex", gap: 3 }}>
                  {row.map((offset) => {
                    const own = fieldAt(frame, offset);
                    const layer = own?.layer ?? "padding";
                    const inField = field !== undefined && own?.id === field.id;
                    return (
                      <button
                        key={offset}
                        type="button"
                        role="gridcell"
                        onClick={() => {
                          pick(offset);
                        }}
                        aria-label={`Octet ${String(offset)} : ${hex[offset] ?? ""}, ${own?.name ?? ""}`}
                        aria-pressed={inField}
                        style={{
                          width: 26,
                          padding: "2px 0",
                          border: `1px solid ${inField ? LAYER_COLORS[layer] : "transparent"}`,
                          background: tint(layer, inField ? 45 : 16),
                          color: inField ? "#F5F5FA" : "#B8B5D1",
                          fontFamily: MONO,
                          fontSize: 13,
                          cursor: "pointer",
                          marginRight: offset % BYTES_PER_ROW === 7 ? 8 : 0,
                        }}
                      >
                        {hex[offset]}
                      </button>
                    );
                  })}
                </span>
                <span aria-hidden="true" style={{ color: "#7F7BA9", whiteSpace: "pre" }}>
                  {row.map((offset) => ascii(frame.bytes[offset] ?? 0)).join("")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          aria-live="polite"
          style={{
            padding: "10px 12px",
            border: `1px solid ${field === undefined ? "#1F1B47" : LAYER_COLORS[field.layer]}`,
            display: "grid",
            gap: 6,
            minHeight: 56,
          }}
        >
          {field === undefined ? (
            <p style={{ margin: 0, color: "#7F7BA9", fontSize: 14 }}>
              Clique sur un octet pour savoir à quel champ il appartient, ou sur une couche pour en
              voir le premier champ.
            </p>
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: 11,
                  color: LAYER_COLORS[field.layer],
                }}
              >
                {LAYER_NAMES[field.layer].toUpperCase()} · {range(field)}
              </p>
              <p style={{ margin: 0, color: "#F5F5FA", fontSize: 15, fontWeight: 600 }}>
                {field.name}
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: 13,
                  color: "#F5F5FA",
                  whiteSpace: "pre-wrap",
                }}
              >
                {field.value}
              </p>
              <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 }}>
                {field.meaning}
              </p>
            </>
          )}
        </div>

        {toFind.length > 0 ? (
          <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10, display: "grid", gap: 8 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {toFind.map((f) => {
                const ok = found.includes(f.id);
                const current = target?.id === f.id;
                return (
                  <li
                    key={f.id}
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      color: ok ? ACCENT : current ? "#F5F5FA" : "#6B6890",
                    }}
                  >
                    {ok ? "✓" : "○"} {f.name}
                    {current ? " : clique sur un de ses octets" : ""}
                  </li>
                );
              })}
            </ul>
            <div aria-live="polite">
              {miss !== null && !done ? (
                <p style={{ margin: 0, color: RED, fontSize: 14 }}>{miss}</p>
              ) : null}
              {done ? (
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                  ✓ Exercice complété : tous les champs sont trouvés.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
