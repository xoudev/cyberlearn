import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  buildFrame,
  fieldAt,
  hexOf,
  LAYER_NAMES,
  type PacketField,
  type PacketLayer,
} from "@cyberlearn/lib/network/packet";
import type { PacketDissector } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <PacketDissector>, played in the app: the same frame, built by
 * @cyberlearn/lib/network/packet, eight bytes to a row for a phone's width. A
 * tap on a byte names its field; the fields to find are ticked one by one.
 */

const MONO = `${fonts.mono}_400Regular`;
const BYTES_PER_ROW = 8;

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

const range = (field: PacketField): string =>
  field.length === 1
    ? `octet ${String(field.offset)}`
    : `octets ${String(field.offset)} à ${String(field.offset + field.length - 1)} (${String(field.length)})`;

export function PacketDissectorExercise({
  dissector,
}: {
  dissector: PacketDissector;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const frame = useMemo(() => buildFrame(dissector.frame), [dissector.frame]);
  const hex = useMemo(() => hexOf(frame.bytes), [frame]);
  const [selected, setSelected] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);

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
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderTopWidth: 2,
        borderTopColor: theme.accent,
        backgroundColor: colors.bgElevated,
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <Text variant="micro" style={{ color: theme.accent }}>
          DÉCORTIQUER UN PAQUET
        </Text>
        {dissector.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {dissector.title}
          </Text>
        ) : null}
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {String(frame.bytes.length)} octets
        </Text>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {dissector.task !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {dissector.task}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {frame.layers.map((span) => (
            <Pressable
              key={`${span.layer}-${String(span.offset)}`}
              onPress={() => {
                setSelected(span.offset);
                setMiss(null);
              }}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: LAYER_COLORS[span.layer],
                backgroundColor: `${LAYER_COLORS[span.layer]}24`,
              }}
            >
              <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textPrimary }}>
                {LAYER_NAMES[span.layer]}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
                {String(span.length)} o
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: theme.terminal.background }}
        >
          <View style={{ padding: 8, gap: 3 }}>
            {rows.map((row) => (
              <View key={row[0]} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{ fontFamily: MONO, fontSize: 12, color: colors.textDisabled, width: 34 }}
                >
                  {(row[0] ?? 0).toString(16).padStart(4, "0")}
                </Text>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {row.map((offset) => {
                    const own = fieldAt(frame, offset);
                    const layer = own?.layer ?? "padding";
                    const inField = field !== undefined && own?.id === field.id;
                    return (
                      <Pressable
                        key={offset}
                        onPress={() => {
                          pick(offset);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Octet ${String(offset)} : ${hex[offset] ?? ""}, ${own?.name ?? ""}`}
                        style={{
                          width: 30,
                          paddingVertical: 4,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: inField ? LAYER_COLORS[layer] : "transparent",
                          backgroundColor: `${LAYER_COLORS[layer]}${inField ? "73" : "29"}`,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: MONO,
                            fontSize: 13,
                            color: inField ? colors.textPrimary : colors.textSecondary,
                          }}
                        >
                          {hex[offset]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          style={{
            padding: 10,
            gap: 4,
            borderWidth: 1,
            borderColor: field === undefined ? colors.borderSubtle : LAYER_COLORS[field.layer],
          }}
        >
          {field === undefined ? (
            <Text variant="bodySm" style={{ color: colors.textMuted }}>
              Touche un octet pour savoir à quel champ il appartient, ou une couche pour en voir le
              premier champ.
            </Text>
          ) : (
            <>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: LAYER_COLORS[field.layer] }}>
                {LAYER_NAMES[field.layer].toUpperCase()} · {range(field)}
              </Text>
              <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                {field.name}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 13, color: colors.textPrimary }}>
                {field.value}
              </Text>
              <Text variant="bodySm" style={{ lineHeight: 20 }}>
                {field.meaning}
              </Text>
            </>
          )}
        </View>

        {toFind.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 10,
              gap: 6,
            }}
          >
            {toFind.map((f) => {
              const ok = found.includes(f.id);
              const current = target?.id === f.id;
              return (
                <Text
                  key={f.id}
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: ok ? theme.accent : current ? colors.textPrimary : colors.textDisabled,
                  }}
                >
                  {ok ? "✓" : "○"} {f.name}
                  {current ? " : touche un de ses octets" : ""}
                </Text>
              );
            })}
            {miss !== null && !done ? (
              <Text variant="bodySm" style={{ color: colors.danger }}>
                {miss}
              </Text>
            ) : null}
            {done ? (
              <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
                ✓ Exercice complété : tous les champs sont trouvés.
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
