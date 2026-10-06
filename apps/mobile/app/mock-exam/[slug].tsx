import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  domainVerdict,
  weakestDomains,
  type MockQuestion,
  type MockResult,
} from "@cyberlearn/lib/exam/mock";
import { Rise } from "@/components/anim";
import { BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { fetchMockOverviewApi, startMockExamApi, submitMockExamApi } from "@/lib/api";
import { clockText, type MockOverview } from "@/lib/mock-exam";

/**
 * The site's mock exam, in the app: what it covers and the attempts made,
 * then the questions with the clock (handed in by itself at zero), then the
 * score by module, what to go back to, and the correction. The draw and the
 * score are the server's (/api/mobile/mock-exam), as on the site.
 */

type Stage =
  | { kind: "intro" }
  | { kind: "running"; attemptId: string; deadline: number; questions: MockQuestion[] }
  | { kind: "result"; result: MockResult; late: boolean };

function verdictColor(percent: number): string {
  if (percent >= 80) return colors.success;
  if (percent >= 50) return colors.warning;
  return colors.danger;
}

export default function MockExamScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mock-exam", slug],
    enabled: Boolean(slug),
    queryFn: () => fetchMockOverviewApi(slug ?? ""),
  });

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error !== null || data === undefined ? (
        <ErrorState onRetry={() => void refetch()} code="MOCK_EXAM_LOAD" />
      ) : (
        <MockExamBody overview={data} />
      )}
    </Screen>
  );
}

function MockExamBody({ overview }: { overview: MockOverview }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);

  const start = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    const started = await startMockExamApi(overview.pathId);
    setBusy(false);
    if (!started.ok) {
      setMessage(started.error);
      return;
    }
    setAnswers({});
    submitting.current = false;
    setStage({
      kind: "running",
      attemptId: started.attemptId,
      deadline: new Date(started.startedAt).getTime() + started.timeLimitMinutes * 60_000,
      questions: started.questions,
    });
  };

  const submit = useCallback(async (): Promise<void> => {
    if (stage.kind !== "running" || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    const handed = await submitMockExamApi(stage.attemptId, answers);
    setBusy(false);
    if (!handed.ok) {
      submitting.current = false;
      setMessage(handed.error);
      return;
    }
    setStage({ kind: "result", result: handed.result, late: handed.late });
    void queryClient.invalidateQueries({ queryKey: ["mock-exam", overview.pathSlug] });
  }, [stage, answers, queryClient, overview.pathSlug]);

  useEffect(() => {
    if (stage.kind !== "running") return;
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [stage.kind]);
  useEffect(() => {
    if (stage.kind === "running" && now >= stage.deadline) void submit();
  }, [now, stage, submit]);

  const groups = useMemo(() => {
    if (stage.kind !== "running") return [];
    const out: { domain: string; questions: MockQuestion[] }[] = [];
    for (const question of stage.questions) {
      const last = out.at(-1);
      if (last?.domain === question.domain) last.questions.push(question);
      else out.push({ domain: question.domain, questions: [question] });
    }
    return out;
  }, [stage]);

  if (stage.kind === "running") {
    const left = stage.deadline - now;
    return (
      <View style={{ gap: 14 }}>
        <Card
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <Text variant="mono" style={{ fontSize: 12 }}>
            {`${String(Object.keys(answers).length)} / ${String(stage.questions.length)} répondues`}
          </Text>
          <Text
            accessibilityLabel="Temps restant"
            style={{
              fontFamily: `${fonts.mono}_500Medium`,
              fontSize: 18,
              color: left < 60_000 ? colors.danger : colors.accent,
            }}
          >
            {clockText(left)}
          </Text>
        </Card>
        {message !== null ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {message}
          </Text>
        ) : null}
        {groups.map((group) => (
          <View key={group.domain} style={{ gap: 10 }}>
            <Text variant="micro" style={{ color: colors.accent, letterSpacing: 1.5 }}>
              {`// ${group.domain}`}
            </Text>
            {group.questions.map((question) => (
              <Card key={question.index} style={{ gap: 8 }}>
                <Text variant="h3">{`${String(question.index + 1)}. ${question.question}`}</Text>
                {question.options.map((option, k) => {
                  const picked = answers[String(question.index)] === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => {
                        setAnswers((prev) => ({ ...prev, [String(question.index)]: k }));
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: picked }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderWidth: 1,
                        borderColor: picked ? colors.accent : colors.borderDefault,
                        backgroundColor: picked ? `${colors.accent}1A` : "transparent",
                      }}
                    >
                      <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            ))}
          </View>
        ))}
        <GradientButton label="Rendre la copie" loading={busy} onPress={() => void submit()} />
      </View>
    );
  }

  if (stage.kind === "result") {
    const { result, late } = stage;
    const weakest = weakestDomains(result.domains);
    return (
      <View style={{ gap: 14 }}>
        <Rise index={0}>
          <Card style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: colors.accent }}>
              {"// RÉSULTAT"}
            </Text>
            <Text variant="display" style={{ fontSize: 30, color: verdictColor(result.score) }}>
              {`${String(result.score)} %`}
            </Text>
            <Text variant="bodySm">
              {`${String(result.correct)} bonnes réponses sur ${String(result.total)}${late ? ", copie rendue après le temps imparti" : ""}.`}
            </Text>
            <Text variant="bodySm">
              {weakest.length > 0
                ? `À revoir en premier : ${weakest.map((d) => d.domain).join(", ")}.`
                : "Tous les modules au-dessus de 70 % : tu es prêt pour l'examen final."}
            </Text>
          </Card>
        </Rise>
        {result.domains.map((domain) => (
          <Card key={domain.domain} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                {domain.domain}
              </Text>
              <Text variant="mono" style={{ fontSize: 11, color: verdictColor(domain.percent) }}>
                {`${String(domain.correct)} / ${String(domain.total)} · ${domainVerdict(domain.percent)}`}
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: colors.borderSubtle }}>
              <View
                style={{
                  width: `${domain.percent}%`,
                  height: 5,
                  backgroundColor: verdictColor(domain.percent),
                }}
              />
            </View>
          </Card>
        ))}
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {"// CORRECTION"}
        </Text>
        {result.review.map((item) => (
          <Card key={item.index} style={{ gap: 4 }}>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {`${item.right ? "✓" : "✗"} ${String(item.index + 1)}. ${item.question}`}
            </Text>
            <Text variant="bodySm">
              {`Ta réponse : ${item.selected === null ? "aucune" : (item.options[item.selected] ?? "")}${item.right ? "" : ` · bonne réponse : ${item.options[item.correct] ?? ""}`}`}
            </Text>
            {item.explanation !== null ? (
              <Text variant="bodySm" style={{ color: colors.textMuted }}>
                {item.explanation}
              </Text>
            ) : null}
          </Card>
        ))}
        <GradientButton
          label="Recommencer avec d'autres questions"
          loading={busy}
          onPress={() => void start()}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 6 }}>
        <Text variant="micro" style={{ color: colors.accent }}>
          {`// EXAMEN BLANC · ${overview.pathTitle}`}
        </Text>
        <Text variant="bodySm">
          {`${String(overview.questionCount)} questions tirées des quiz du parcours, trois par module, en ${String(overview.timeLimitMinutes)} minutes. Le score se lit par module, comme à une certification. Un entraînement : ni certificat, ni XP, autant de fois que tu veux.`}
        </Text>
      </Card>
      {overview.domains.map((domain) => (
        <View
          key={domain.domain}
          style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}
        >
          <Text variant="bodySm" style={{ flex: 1 }}>
            {domain.domain}
          </Text>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`${String(domain.drawn)} question${domain.drawn > 1 ? "s" : ""}`}
          </Text>
        </View>
      ))}
      {overview.history.length > 0 ? (
        <Card style={{ gap: 4 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            TES DERNIERS EXAMENS BLANCS
          </Text>
          {overview.history.map((attempt) => (
            <View
              key={attempt.submittedAt}
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text variant="bodySm">
                {new Date(attempt.submittedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
              <Text variant="mono" style={{ fontSize: 11, color: verdictColor(attempt.score) }}>
                {`${String(attempt.score)} %${attempt.late ? " (hors délai)" : ""}`}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      {message !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {message}
        </Text>
      ) : null}
      {overview.ready ? (
        <GradientButton
          label={
            overview.running !== null ? "Reprendre l'examen en cours" : "Commencer l'examen blanc"
          }
          loading={busy}
          onPress={() => void start()}
        />
      ) : (
        <Text variant="bodySm" style={{ color: colors.textMuted }}>
          Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
        </Text>
      )}
    </View>
  );
}
