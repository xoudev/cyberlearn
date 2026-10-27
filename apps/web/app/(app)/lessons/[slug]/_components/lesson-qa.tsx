import React from "react";
import { PostQuestionForm, PostAnswerForm, AcceptAnswerButton, UpvoteButton } from "./qa-forms";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import { FriendMark } from "@/components/friend-mark";
import { ReportContentButton } from "@/components/report-content-dialog";

interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  upvotes: number;
  createdAt: Date;
  user: { id?: string; displayName: string | null; username: string | null; level: number } | null;
}

interface Question {
  id: string;
  title: string;
  content: string;
  isResolved: boolean;
  createdAt: Date;
  user: { id?: string; displayName: string | null; username: string | null; level: number } | null;
  answers: Answer[];
  _count: { answers: number };
}

interface LessonQAProps {
  lessonId: string;
  lessonSlug: string;
  currentUserId: string;
  questions: Question[];
  /** The reader's friends (friendshipRepository.friendIds), marked beside their names. */
  friendIds?: ReadonlySet<string>;
}

const NO_FRIENDS: ReadonlySet<string> = new Set();

export function LessonQA({
  lessonId,
  lessonSlug,
  currentUserId,
  questions,
  friendIds = NO_FRIENDS,
}: LessonQAProps): React.JSX.Element {
  return (
    <div className="lesson-discussion" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 16,
              height: 1,
              background: "var(--cosmetic-accent)",
              display: "inline-block",
            }}
          />
          Questions & Réponses
        </div>
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--color-text-primary)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {questions.length > 0
            ? `${String(questions.length)} question${questions.length > 1 ? "s" : ""}`
            : "Aucune question pour l'instant"}
        </h3>
      </div>

      {/* Question form - renders full-width below the header */}
      <div style={{ marginBottom: 24 }}>
        <PostQuestionForm lessonId={lessonId} />
      </div>

      {/* Questions list */}
      {questions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              lessonSlug={lessonSlug}
              currentUserId={currentUserId}
              friendIds={friendIds}
            />
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed var(--color-border-subtle)",
            background: "var(--color-bg-elevated)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            style={{ marginBottom: 14, opacity: 0.4 }}
          >
            <circle cx="20" cy="20" r="18" stroke="var(--color-border-default)" strokeWidth="1.5" />
            <path
              d="M15 16c0-2.8 2.2-5 5-5s5 2.2 5 5c0 2.5-2 4-4 4.5V22"
              stroke="var(--color-border-default)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="20" cy="27" r="1" fill="var(--color-border-default)" />
          </svg>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Sois le premier à poser une question sur cette leçon.
          </p>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  lessonSlug,
  currentUserId,
  friendIds,
}: {
  question: Question;
  lessonSlug: string;
  currentUserId: string;
  friendIds: ReadonlySet<string>;
}) {
  const isAuthor = question.user?.id === currentUserId;
  const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    question.createdAt,
  );

  return (
    <div
      className="lesson-question"
      style={{
        background: "var(--color-bg-elevated)",
        border: `1px solid ${question.isResolved ? "color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)" : "var(--color-border-subtle)"}`,
        overflow: "hidden",
      }}
    >
      {/* Question header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom:
            question.answers.length > 0 ? "1px solid var(--color-border-subtle)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <h4
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-text-primary)",
              margin: 0,
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            {question.title}
          </h4>
          {question.isResolved && (
            <span
              className="mono-label mono-label--xs"
              style={{
                color: "var(--cosmetic-accent)",
                background: "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 25%, transparent)",
                padding: "3px 8px",
                flexShrink: 0,
              }}
            >
              Résolu
            </span>
          )}
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-text-secondary)",
            margin: "0 0 14px",
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
          }}
        >
          {question.content}
        </p>

        {/* Wraps like the answers' row below: at 375 px the name, the date, the
            count and "Signaler" no longer fit on one line, and the card
            (overflow hidden) cut the button off instead. */}
        <div
          className="lesson-question__meta"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            rowGap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-text-muted)",
          }}
        >
          <UserPill user={question.user} friendIds={friendIds} />
          <span style={{ color: "var(--color-text-faint)" }}>·</span>
          <span>{dateStr}</span>
          <span style={{ color: "var(--color-text-faint)" }}>·</span>
          <span>
            {question._count.answers} réponse{question._count.answers > 1 ? "s" : ""}
          </span>
          {!isAuthor && (
            <span style={{ marginLeft: "auto" }}>
              <ReportContentButton surface="LESSON_QUESTION" contentId={question.id} />
            </span>
          )}
        </div>
      </div>

      {/* Answers */}
      {question.answers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {question.answers.map((answer, i) => (
            <AnswerRow
              key={answer.id}
              answer={answer}
              lessonSlug={lessonSlug}
              isQuestionAuthor={isAuthor}
              isMine={answer.user?.id === currentUserId}
              isLast={i === question.answers.length - 1}
              friendIds={friendIds}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      <div
        style={{
          padding: "14px 22px",
          borderTop: question.answers.length > 0 ? "1px solid var(--color-border-subtle)" : "none",
        }}
      >
        <PostAnswerForm questionId={question.id} />
      </div>
    </div>
  );
}

function AnswerRow({
  answer,
  lessonSlug,
  isQuestionAuthor,
  isMine,
  isLast,
  friendIds,
}: {
  answer: Answer;
  lessonSlug: string;
  isQuestionAuthor: boolean;
  /** The reader wrote it: nothing to report. */
  isMine: boolean;
  isLast: boolean;
  friendIds: ReadonlySet<string>;
}) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    answer.createdAt,
  );

  return (
    <div
      style={{
        padding: "16px 22px 16px 38px",
        borderBottom: !isLast ? "1px solid var(--color-border-subtle)" : "none",
        background: answer.isAccepted
          ? "color-mix(in srgb, var(--cosmetic-accent) 3%, transparent)"
          : "transparent",
        position: "relative",
      }}
    >
      {/* Left accent for accepted */}
      {answer.isAccepted && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "var(--cosmetic-accent)",
            boxShadow: "2px 0 8px color-mix(in srgb, var(--cosmetic-accent) 30%, transparent)",
          }}
        />
      )}

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          margin: "0 0 12px",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {answer.content}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <UserPill user={answer.user} friendIds={friendIds} />
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)" }}
        >
          ·
        </span>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)" }}
        >
          {dateStr}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <UpvoteButton answerId={answer.id} lessonSlug={lessonSlug} upvotes={answer.upvotes} />
          {!isMine && <ReportContentButton surface="LESSON_ANSWER" contentId={answer.id} />}
          {isQuestionAuthor && (
            <AcceptAnswerButton
              answerId={answer.id}
              lessonSlug={lessonSlug}
              isAccepted={answer.isAccepted}
            />
          )}
        </span>
      </div>
    </div>
  );
}

export function UserPill({
  user,
  friendIds,
}: {
  user: {
    id?: string;
    displayName: string | null;
    username: string | null;
    level: number;
  } | null;
  friendIds: ReadonlySet<string>;
}): React.JSX.Element {
  const name = user?.displayName ?? user?.username ?? "Utilisateur supprimé";
  // A question or an answer is always signed: the mark only needs the id.
  const isFriend = user?.id !== undefined && friendIds.has(user.id);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--color-text-secondary)",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          background: "#191c22",
          border: `1px solid ${user ? "var(--cosmetic-accent)" : "var(--color-border-default)"}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 10,
          color: user ? "#f4f2ed" : "var(--color-text-muted)",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span
        style={{
          color: user ? "var(--color-text-primary)" : "var(--color-text-muted)",
          fontWeight: 600,
        }}
      >
        {name}
      </span>
      {isFriend && <FriendMark size={12} />}
      {user && (
        <span style={{ color: "var(--cosmetic-accent)", fontSize: 9 }}>
          {levelLabel(user.level)}
        </span>
      )}
    </span>
  );
}
