import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { RECALL_MISSING } from "@cyberlearn/lib/revisions/recall-copy";
import { BackButton } from "@/components/buttons";
import { RecallFlow, RecallHeader } from "@/components/recall-flow";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { answerModuleReviewApi } from "@/lib/api";
import { useModuleReview } from "@/lib/queries";
import { moduleAnswerBody, type RecallAnswerReply } from "@/lib/rappel";
import { useSession } from "@/lib/session";

/**
 * "Réviser ce module · 2 min", from the module's header on a path: six
 * questions at most from the module's lessons the learner finished, the same
 * all day, each answer checked by the site's service with its explanation
 * and the way back to the passage. A free run: no XP, nothing recorded, no
 * card moved; the day's recall is what pays.
 */
export default function ModuleReviewScreen(): React.JSX.Element {
  const router = useRouter();
  const { slug, module, title } = useLocalSearchParams<{
    slug: string;
    module: string;
    title?: string;
  }>();
  const moduleNumber = Number(module);
  const { session } = useSession();
  const { data, isLoading, refetch } = useModuleReview(session?.user.id, slug, moduleNumber);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label={title ?? "Parcours"} />
      </View>
      <RecallHeader mode="module" view={data} />

      {data !== undefined ? (
        <RecallFlow
          view={data}
          answer={(question, selected) => {
            const body = moduleAnswerBody(data, question, selected);
            return body === null
              ? Promise.resolve<RecallAnswerReply>({ ok: false, error: RECALL_MISSING })
              : answerModuleReviewApi(body);
          }}
          // Nothing kept on the server to read back: a refused question is set aside.
          reread={() => Promise.resolve()}
          onOpenSettings={() => {
            router.push("/settings");
          }}
        />
      ) : isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ErrorState onRetry={() => void refetch()} code="MODULE_REVIEW_LOAD" />
      )}
    </Screen>
  );
}
