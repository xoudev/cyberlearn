import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { BackButton } from "@/components/buttons";
import { RecallFlow, RecallHeader } from "@/components/recall-flow";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { answerDailyRecallApi } from "@/lib/api";
import { dailyRecallKey, useDailyRecall } from "@/lib/queries";
import {
  justHandedIn,
  withVerdict,
  type RecallResult,
  type RecallVerdict,
  type RecallView,
} from "@/lib/rappel";
import { useSession } from "@/lib/session";

/**
 * Révisions: the day's recall, the site's ?rappel=1 window. Six questions at
 * most from the learner's finished lessons, drawn once a day by the site's
 * service, each answer checked there with its explanation; the last one
 * hands the recall in for 15 XP, once a day, counted for the streak. Opened
 * from the home tab's card, the profile's "Révisions" and the daily reminder
 * (lib/notification-links.ts). The route keeps its name, so the links of the
 * older app versions and notifications still land here.
 *
 * Honours the spacedRepetition switch as the site does: the server answers
 * "off", and the screen points to the settings.
 */
export default function Revisions(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, refetch } = useDailyRecall(userId);

  // Handed in, by the last answer here or read back after a refusal (its
  // reply lost, or answered on the site): XP, level, streak and its weekly
  // quest moved on the server, and the home tab does not refetch on focus.
  const seen = useRef<RecallView | undefined>(undefined);
  useEffect(() => {
    if (justHandedIn(seen.current, data)) {
      void queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["streak", userId] });
      void queryClient.invalidateQueries({ queryKey: ["quests", userId] });
    }
    seen.current = data;
  }, [data, queryClient, userId]);

  const onAnswered = (verdict: RecallVerdict, result: RecallResult | null): void => {
    // The home tab's card reads the same query: it says "fait aujourd'hui"
    // as soon as the last answer hands the recall in.
    queryClient.setQueryData<RecallView>(dailyRecallKey(userId), (old) =>
      old === undefined ? old : withVerdict(old, verdict, result),
    );
  };

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <RecallHeader mode="daily" view={data} />

      {data !== undefined ? (
        <RecallFlow
          view={data}
          answer={(question, selected) => answerDailyRecallApi(question.index, selected)}
          reread={async () => {
            await refetch();
          }}
          onAnswered={onAnswered}
          onOpenSettings={() => {
            router.push("/settings");
          }}
        />
      ) : isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ErrorState onRetry={() => void refetch()} code="RAPPEL_LOAD" />
      )}
    </Screen>
  );
}
