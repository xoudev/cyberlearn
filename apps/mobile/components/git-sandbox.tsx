import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { checkHolds } from "@cyberlearn/lib/git/checks";
import { DEFAULT_GEOMETRY, layoutGraph } from "@cyberlearn/lib/git/graph";
import { type GitState, promptOf, run, runSetup, statusOf } from "@cyberlearn/lib/git/sandbox";
import type { GitSandbox } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <GitSandbox>, played in the app: the same simulated repository
 * (@cyberlearn/lib/git), a command line, and the branch graph drawn after each
 * command. A phone keyboard makes quotes and > slow to reach, so the usual
 * commands sit in a row above the field, ready to complete.
 */

const MONO = `${fonts.mono}_400Regular`;
const LANE_COLORS = ["#7B61FF", colors.warning, "#FF6BCB", "#4DA3FF"];
const QUICK = [
  "git status",
  "git log --oneline",
  "git add .",
  'git commit -m ""',
  "git switch ",
  "git merge ",
  "cat ",
  "ls",
];

interface Entry {
  key: number;
  prompt: string;
  line: string;
  output: string;
  ok: boolean;
}

/** The files as `git status --short` writes them. */
function shortStatus(state: GitState): { code: string; path: string }[] {
  const s = statusOf(state);
  const rows = new Map<string, [string, string]>();
  const letter = { "new file": "A", modified: "M", deleted: "D" } as const;
  for (const f of s.staged) rows.set(f.path, [letter[f.kind], " "]);
  for (const f of s.unstaged) rows.set(f.path, [rows.get(f.path)?.[0] ?? " ", letter[f.kind]]);
  for (const p of s.untracked) rows.set(p, ["?", "?"]);
  for (const p of s.unmerged) rows.set(p, ["U", "U"]);
  return [...rows.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, [x, y]]) => ({ code: `${x}${y}`, path }));
}

function Graph({ state, accent }: { state: GitState; accent: string }): React.JSX.Element {
  const layout = useMemo(() => layoutGraph(state), [state]);
  const lane = (n: number): string =>
    n === 0 ? accent : (LANE_COLORS[(n - 1) % LANE_COLORS.length] ?? accent);
  const { rowHeight } = DEFAULT_GEOMETRY;
  if (layout.rows.length === 0) {
    return (
      <Text variant="mono" style={{ color: colors.textMuted }}>
        {state.initialized ? "Pas encore de commit." : "Pas encore de dépôt : git init."}
      </Text>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View
        style={{ height: layout.height, minWidth: layout.width + 240 }}
        accessible
        accessibilityLabel={`Graphe des commits : ${layout.rows
          .map((r) => `${r.message}${r.branches.length > 0 ? ` (${r.branches.join(", ")})` : ""}`)
          .join(", puis ")}`}
      >
        <Svg
          width={layout.width}
          height={layout.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {layout.edges.map((edge) => (
            <Path key={edge.d} d={edge.d} fill="none" stroke={lane(edge.lane)} strokeWidth={2} />
          ))}
          {layout.rows.map((row) => (
            <Circle
              key={row.id}
              cx={row.x}
              cy={row.y}
              r={row.merge ? 6 : 5}
              fill={row.head ? lane(row.lane) : colors.bgBase}
              stroke={lane(row.lane)}
              strokeWidth={2}
            />
          ))}
        </Svg>
        {layout.rows.map((row) => (
          <View
            key={row.id}
            style={{
              position: "absolute",
              left: layout.width + 4,
              top: row.y - rowHeight / 2,
              height: rowHeight,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
              {row.id}
            </Text>
            {row.branches.map((name, i) => {
              const isHead = row.head && i === 0;
              return (
                <Text
                  key={name}
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    paddingHorizontal: 5,
                    borderWidth: 1,
                    borderColor: isHead ? accent : colors.borderDefault,
                    color: isHead ? accent : colors.textSecondary,
                  }}
                >
                  {isHead ? `HEAD → ${name}` : name}
                </Text>
              );
            })}
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textPrimary }}>
              {row.message}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function GitSandboxExercise({ sandbox }: { sandbox: GitSandbox }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [setup] = useState(() => runSetup(sandbox.setup ?? []));
  const start = setup.ok ? setup.state : null;
  const [state, setState] = useState<GitState | null>(start);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [line, setLine] = useState("");
  const [hintsOpen, setHintsOpen] = useState(false);
  const counter = useRef(0);
  const screen = useRef<ScrollView | null>(null);

  if (!setup.ok || state === null) {
    return (
      <View style={{ borderWidth: 1, borderColor: colors.danger, padding: 12 }}>
        <Text variant="bodySm">
          Bac à sable Git indisponible :{" "}
          {setup.ok ? "" : `la commande de préparation « ${setup.command} » échoue.`}
        </Text>
      </View>
    );
  }
  const checks = sandbox.checks ?? [];
  const passed = checks.map((c) => checkHolds(state, c));
  const allDone = checks.length > 0 && passed.every(Boolean);
  const files = shortStatus(state);

  const submit = (): void => {
    const typed = line.trim();
    setLine("");
    if (typed === "") return;
    if (typed === "clear") {
      setEntries([]);
      return;
    }
    const result = run(state, typed);
    counter.current += 1;
    setEntries((e) => [
      ...e.slice(-60),
      {
        key: counter.current,
        prompt: promptOf(state),
        line: typed,
        output: result.output,
        ok: result.ok,
      },
    ]);
    setState(result.state);
  };

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
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
          gap: 8,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            GIT · BAC À SABLE
          </Text>
          {sandbox.title !== undefined ? (
            <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
              {sandbox.title}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            setState(start);
            setEntries([]);
          }}
          accessibilityRole="button"
          style={{
            borderWidth: 1,
            borderColor: colors.borderDefault,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text variant="mono" style={{ fontSize: 11 }}>
            Réinitialiser
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {sandbox.task !== undefined ? <Text variant="bodySm">{sandbox.task}</Text> : null}

        <View
          style={{
            backgroundColor: theme.terminal.background,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <ScrollView
            ref={screen}
            style={{ height: 220 }}
            contentContainerStyle={{ padding: 10, gap: 6 }}
            onContentSizeChange={() => screen.current?.scrollToEnd({ animated: false })}
            nestedScrollEnabled
          >
            {entries.length === 0 ? (
              <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted }}>
                Tape help pour la liste des commandes.
              </Text>
            ) : null}
            {entries.map((entry) => (
              <View key={entry.key}>
                <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted }}>
                  {entry.prompt}{" "}
                  <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textPrimary }}>
                    {entry.line}
                  </Text>
                </Text>
                {entry.output !== "" ? (
                  <Text
                    selectable
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      lineHeight: 18,
                      color: entry.ok ? theme.terminal.foreground : colors.danger,
                    }}
                  >
                    {entry.output.replace(/\t/gu, "    ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}
            style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle }}
          >
            {QUICK.map((q) => (
              <Pressable
                key={q}
                onPress={() => {
                  setLine(q);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Écrire ${q}`}
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textSecondary }}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
              {state.merging
                ? `(${state.head}|MERGING)$`
                : state.initialized
                  ? `(${state.head})$`
                  : "$"}
            </Text>
            <TextInput
              value={line}
              onChangeText={setLine}
              onSubmitEditing={submit}
              submitBehavior="submit"
              returnKeyType="send"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel="Commande"
              placeholder="git status"
              placeholderTextColor={colors.textDisabled}
              style={{
                flex: 1,
                paddingVertical: 10,
                color: colors.textPrimary,
                fontFamily: MONO,
                fontSize: 13,
              }}
            />
            <Pressable
              onPress={submit}
              accessibilityRole="button"
              accessibilityLabel="Exécuter"
              hitSlop={8}
            >
              <Text style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}>↵</Text>
            </Pressable>
          </View>
        </View>

        <Graph state={state} accent={theme.accent} />

        {files.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 6 }}>
            {files.map((f) => (
              <Text
                key={f.path}
                style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    color:
                      f.code === "??"
                        ? colors.textMuted
                        : f.code === "UU"
                          ? colors.danger
                          : theme.accent,
                  }}
                >
                  {f.code}
                </Text>{" "}
                {f.path}
              </Text>
            ))}
          </View>
        ) : null}

        {checks.length > 0 ? (
          <View
            style={{
              gap: 4,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 8,
            }}
          >
            {checks.map((check, i) => (
              <Text
                key={check.label}
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: passed[i] ? theme.accent : colors.textMuted,
                }}
              >
                {passed[i] ? "✓" : "○"} {check.label}
              </Text>
            ))}
            {allDone ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{ fontFamily: MONO, fontSize: 12, color: theme.accent, marginTop: 4 }}
              >
                ✓ Exercice complété : tout ce qui était demandé est fait.
              </Text>
            ) : null}
          </View>
        ) : null}

        {sandbox.hints && sandbox.hints.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Pressable
              onPress={() => {
                setHintsOpen((o) => !o);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: hintsOpen }}
            >
              <Text variant="micro" style={{ color: theme.accent }}>
                {hintsOpen ? "▾" : "▸"} INDICES ({String(sandbox.hints.length)})
              </Text>
            </Pressable>
            {hintsOpen
              ? sandbox.hints.map((hint, i) => (
                  <Text
                    key={hint}
                    style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}
                  >
                    {String(i + 1)}. {hint}
                  </Text>
                ))
              : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
