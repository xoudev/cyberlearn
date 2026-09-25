import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { HeldNotice, MessageInput } from "@/components/forum";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import {
  acceptLessonAnswerApi,
  answerLessonQuestionApi,
  askLessonQuestionApi,
  upvoteLessonAnswerApi,
} from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  QA_BODY_MAX,
  QUESTION_TITLE_MAX,
  answerCountLabel,
  answerDraftProblem,
  canAccept,
  canUpvote,
  qaDate,
  questionCountLabel,
  questionDraftProblem,
  type QaAnswer,
  type QaAuthor,
  type QaQuestion,
} from "@/lib/lesson-qa";
import { useLessonQa } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * A lesson's questions and answers: the Q&A under a lesson on the site. Ask,
 * answer, accept an answer on one's own question, upvote somebody else's.
 * Every write goes through the site's service: same limits, same screen, the
 * same "held for review" when the moderation takes a message down.
 */
export default function LessonQuestions(): React.JSX.Element {
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  const { theme } = useCosmetics();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useLessonQa(session?.user.id, lessonId);

  const reload = async (): Promise<void> => {
    await refetch();
  };

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Leçon" />
      </View>
      <View style={{ gap: 6, marginBottom: 18 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// Questions · ${data ? questionCountLabel(data.length) : "…"}`}
        </Text>
        <Text variant="display" style={{ fontSize: 24 }}>
          {title ?? "Questions sur la leçon"}
        </Text>
      </View>

      {lessonId ? <AskForm lessonId={lessonId} onPosted={reload} /> : null}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="LESSON_QA" />
      ) : data.length === 0 ? (
        <EmptyState
          title="Aucune question pour l'instant"
          body="Sois le premier à poser une question sur cette leçon."
        />
      ) : (
        <View style={{ gap: 12, marginTop: 18 }}>
          {data.map((question) => (
            <QuestionCard key={question.id} question={question} onChanged={reload} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function AuthorLine({
  author,
  date,
  extra,
}: { author: QaAuthor | null; date: string; extra?: string }): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
      <Text style={{ color: author ? colors.textPrimary : colors.textMuted }}>
        {author?.name ?? "Utilisateur supprimé"}
      </Text>
      {author ? (
        <Text style={{ color: theme.accent }}>{` LVL·${String(author.level)}`}</Text>
      ) : null}
      {` · ${qaDate(date)}`}
      {extra !== undefined ? ` · ${extra}` : ""}
    </Text>
  );
}

function AskForm({
  lessonId,
  onPosted,
}: {
  lessonId: string;
  onPosted: () => Promise<void>;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);

  const send = async (): Promise<void> => {
    const problem = questionDraftProblem(title, content);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const reply = await askLessonQuestionApi({
      lessonId,
      title: title.trim(),
      content: content.trim(),
    });
    setSending(false);
    if (!reply.ok) {
      setError(reply.error);
      return;
    }
    setTitle("");
    setContent("");
    setOpen(false);
    setHeld(reply.heldForReview === true);
    await onPosted();
  };

  if (!open) {
    return (
      <View style={{ gap: 10 }}>
        {held ? <HeldNotice /> : null}
        <GradientButton
          label="Poser une question"
          onPress={() => {
            setOpen(true);
            setHeld(false);
          }}
        />
      </View>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <Text variant="h3">Ta question</Text>
      <MessageInput
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          setError(null);
        }}
        multiline={false}
        minHeight={48}
        maxLength={QUESTION_TITLE_MAX}
        placeholder="Titre de ta question (10 à 200 caractères)"
        accessibilityLabel="Titre de ta question"
      />
      <MessageInput
        value={content}
        onChangeText={(text) => {
          setContent(text);
          setError(null);
        }}
        maxLength={QA_BODY_MAX}
        placeholder="Décris ta question en détail (20 à 5000 caractères)"
        accessibilityLabel="Ta question en détail"
      />
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GradientButton
          label={sending ? "Envoi…" : "Publier la question"}
          disabled={sending}
          onPress={() => void send()}
          style={{ flex: 1 }}
        />
        <ActionChip
          label="Annuler"
          tone="neutral"
          disabled={sending}
          onPress={() => {
            setOpen(false);
            setError(null);
          }}
        />
      </View>
    </Card>
  );
}

function QuestionCard({
  question,
  onChanged,
}: {
  question: QaQuestion;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Card accent={question.isResolved ? theme.accent : undefined} style={{ gap: 10 }}>
      <View style={{ gap: 4 }}>
        {question.isResolved ? (
          <Text variant="micro" style={{ color: theme.accent }}>
            ✓ Résolue
          </Text>
        ) : null}
        <Text variant="h3">{question.title}</Text>
        <AuthorLine
          author={question.author}
          date={question.createdAt}
          extra={answerCountLabel(question.answerCount)}
        />
      </View>
      <Text variant="body" selectable style={{ color: colors.textSecondary }}>
        {question.content}
      </Text>

      {question.answers.length > 0 ? (
        <View style={{ gap: 8 }}>
          {question.answers.map((answer) => (
            <AnswerRow key={answer.id} question={question} answer={answer} onChanged={onChanged} />
          ))}
        </View>
      ) : null}

      <AnswerForm questionId={question.id} onPosted={onChanged} />
    </Card>
  );
}

function AnswerRow({
  question,
  answer,
  onChanged,
}: {
  question: QaQuestion;
  answer: QaAnswer;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [pending, setPending] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (call: () => ReturnType<typeof upvoteLessonAnswerApi>): Promise<boolean> => {
    setPending(true);
    setError(null);
    const reply = await call();
    setPending(false);
    if (!reply.ok) {
      setError(reply.error);
      return false;
    }
    await onChanged();
    return true;
  };

  return (
    <View
      style={{
        gap: 6,
        padding: 10,
        borderLeftWidth: answer.isAccepted ? 3 : 1,
        borderLeftColor: answer.isAccepted ? theme.accent : colors.borderSubtle,
        backgroundColor: answer.isAccepted ? `${theme.accent}0A` : "transparent",
      }}
    >
      <AuthorLine author={answer.author} date={answer.createdAt} />
      <Text variant="bodySm" selectable style={{ color: colors.textPrimary }}>
        {answer.content}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voter pour cette réponse, ${String(answer.upvotes)} votes`}
          accessibilityState={{ disabled: !canUpvote(answer) || voted || pending }}
          disabled={!canUpvote(answer) || voted || pending}
          onPress={() => {
            void act(() => upvoteLessonAnswerApi(answer.id)).then((ok) => {
              if (ok) setVoted(true);
            });
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            minHeight: 32,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: voted ? colors.info : colors.borderSubtle,
            opacity: canUpvote(answer) ? 1 : 0.5,
          }}
        >
          <Text
            variant="mono"
            style={{ fontSize: 11, color: voted ? colors.info : colors.textMuted }}
          >
            ▲ {answer.upvotes}
          </Text>
        </Pressable>
        {answer.isAccepted ? (
          <Text variant="micro" style={{ color: theme.accent }}>
            ✓ Acceptée
          </Text>
        ) : canAccept(question, answer) ? (
          <ActionChip
            label="Accepter"
            disabled={pending}
            onPress={() => void act(() => acceptLessonAnswerApi(answer.id))}
          />
        ) : null}
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function AnswerForm({
  questionId,
  onPosted,
}: {
  questionId: string;
  onPosted: () => Promise<void>;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);

  const send = async (): Promise<void> => {
    const problem = answerDraftProblem(content);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const reply = await answerLessonQuestionApi(questionId, content.trim());
    setSending(false);
    if (!reply.ok) {
      setError(reply.error);
      return;
    }
    setContent("");
    setOpen(false);
    setHeld(reply.heldForReview === true);
    await onPosted();
  };

  if (!open) {
    return (
      <View style={{ gap: 8 }}>
        {held ? <HeldNotice /> : null}
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip
            label="Répondre"
            tone="neutral"
            onPress={() => {
              setOpen(true);
              setHeld(false);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <MessageInput
        value={content}
        onChangeText={(text) => {
          setContent(text);
          setError(null);
        }}
        minHeight={90}
        maxLength={QA_BODY_MAX}
        placeholder="Ta réponse (10 à 5000 caractères)"
        accessibilityLabel="Ta réponse"
      />
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GradientButton
          label={sending ? "Envoi…" : "Publier"}
          disabled={sending}
          onPress={() => void send()}
          style={{ flex: 1 }}
        />
        <ActionChip
          label="Annuler"
          tone="neutral"
          disabled={sending}
          onPress={() => {
            setOpen(false);
            setError(null);
          }}
        />
      </View>
    </View>
  );
}
