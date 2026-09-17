import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { fetchMyClass, type ClassWorkItem } from "@/lib/api";

/**
 * What the learner's class has set for them.
 *
 * This screen exists because the site e-mails a student when work is assigned.
 * An e-mail that says "tu as une leçon à rendre" and an app with nowhere to
 * show it is worse than not having sent the e-mail at all.
 *
 * The teacher's side of My class is deliberately not here: setting work,
 * writing lessons and building paths are sitting-down jobs done on a keyboard,
 * and they are listed as web-only in docs/MOBILE_PARITY.md rather than left
 * looking forgotten.
 */

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(iso));
}

/** Overdue first, then soonest, then undated, then everything already done. */
function rank(item: ClassWorkItem, now: number): number {
  if (item.done) return 3;
  if (item.dueAt === null) return 2;
  return new Date(item.dueAt).getTime() < now ? 0 : 1;
}

export default function MyClass(): React.JSX.Element {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-class"],
    queryFn: fetchMyClass,
  });

  const now = Date.now();
  const work = [...(data?.work ?? [])].sort(
    (a, b) =>
      rank(a, now) - rank(b, now) ||
      (a.dueAt === null ? 0 : new Date(a.dueAt).getTime()) -
        (b.dueAt === null ? 0 : new Date(b.dueAt).getTime()),
  );
  const todo = work.filter((w) => !w.done).length;

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="CLASS_LOAD" />
      ) : data.classes.length === 0 ? (
        <EmptyState
          title="Tu n'es dans aucune classe"
          body="Ton établissement t'y ajoutera. Tu recevras un e-mail quand ce sera fait."
        />
      ) : (
        <View style={{ gap: 24 }}>
          {data.classes.map((klass) => (
            <View key={klass.id}>
              <SectionLabel
                eyebrow={`${klass.establishment} · ${klass.promotion}`}
                title={klass.name}
              />
              <Card>
                <Text variant="micro" style={{ color: colors.textMuted, marginBottom: 8 }}>
                  {klass.memberCount} élève{klass.memberCount > 1 ? "s" : ""}
                </Text>
                {klass.teachers.length > 0 ? (
                  <View style={{ gap: 4 }}>
                    {klass.teachers.map((t) => (
                      <Text key={t.name} style={{ fontSize: 13 }}>
                        {t.name}
                        {t.subject !== null ? (
                          <Text variant="micro" style={{ color: colors.textMuted }}>
                            {`  ${t.subject}`}
                          </Text>
                        ) : null}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text variant="micro" style={{ color: colors.textMuted }}>
                    Aucun professeur rattaché pour l&apos;instant.
                  </Text>
                )}
              </Card>
            </View>
          ))}

          <View>
            <SectionLabel
              eyebrow="À faire"
              title={
                todo === 0
                  ? "Rien en attente"
                  : `${String(todo)} leçon${todo > 1 ? "s" : ""} à rendre`
              }
            />
            {work.length === 0 ? (
              <EmptyState
                title="Aucun travail donné"
                body="Ce que tes professeurs te donneront apparaîtra ici, avec la date."
              />
            ) : (
              <View style={{ gap: 8 }}>
                {work.map((item) => {
                  const overdue =
                    !item.done && item.dueAt !== null && new Date(item.dueAt).getTime() < now;
                  return (
                    <Pressable
                      key={item.lessonId}
                      onPress={() => {
                        router.push(`/lessons/${item.slug}`);
                      }}
                    >
                      <Card
                        style={{
                          borderLeftWidth: 3,
                          borderLeftColor: item.done
                            ? colors.accent
                            : overdue
                              ? colors.danger
                              : colors.borderDefault,
                          opacity: item.done ? 0.6 : 1,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <Text
                            style={{
                              flex: 1,
                              fontFamily: fonts.sans,
                              fontWeight: "700",
                              fontSize: 14,
                              textDecorationLine: item.done ? "line-through" : "none",
                            }}
                          >
                            {item.title}
                          </Text>
                          {item.done ? (
                            <Pill label="Fait" color={colors.accent} />
                          ) : overdue ? (
                            <Pill label="En retard" color={colors.danger} />
                          ) : null}
                        </View>

                        <Text variant="micro" style={{ color: colors.textMuted, marginTop: 6 }}>
                          {item.estimatedMinutes} min
                          {item.dueAt !== null
                            ? ` · ${overdue ? "échue le" : "avant le"} ${dayLabel(item.dueAt)}`
                            : " · sans date"}
                        </Text>

                        {item.instructions !== null ? (
                          <Text
                            variant="micro"
                            style={{ color: colors.textSecondary, marginTop: 6 }}
                          >
                            {item.instructions}
                          </Text>
                        ) : null}
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
