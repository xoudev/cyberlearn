import React from "react";
import { PostQuestionForm, PostAnswerForm, AcceptAnswerButton, UpvoteButton } from "./qa-forms";

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
}

export function LessonQA({
  lessonId,
  lessonSlug,
  currentUserId,
  questions,
}: LessonQAProps): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
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
            color: "#F5F5FA",
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
        <PostQuestionForm lessonId={lessonId} lessonSlug={lessonSlug} />
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
            />
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed #1F1B47",
            background: "rgba(5,4,26,0.4)",
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
            <circle cx="20" cy="20" r="18" stroke="#2A2560" strokeWidth="1.5" />
            <path
              d="M15 16c0-2.8 2.2-5 5-5s5 2.2 5 5c0 2.5-2 4-4 4.5V22"
              stroke="#2A2560"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="20" cy="27" r="1" fill="#2A2560" />
          </svg>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
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
}: { question: Question; lessonSlug: string; currentUserId: string }) {
  const isAuthor = question.user?.id === currentUserId;
  const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    question.createdAt,
  );

  return (
    <div
      style={{
        background: question.isResolved
          ? "linear-gradient(135deg, color-mix(in srgb, var(--cosmetic-accent) 4%, transparent), transparent 50%), rgba(5,4,26,0.5)"
          : "rgba(5,4,26,0.5)",
        border: `1px solid ${question.isResolved ? "color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)" : "#1F1B47"}`,
        overflow: "hidden",
      }}
    >
      {/* Question header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom: question.answers.length > 0 ? "1px solid #1F1B47" : "none",
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
              color: "#F5F5FA",
              margin: 0,
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            {question.title}
          </h4>
          {question.isResolved && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
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
            color: "#B8B5D1",
            margin: "0 0 14px",
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
          }}
        >
          {question.content}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#6B6890",
          }}
        >
          <UserPill user={question.user} />
          <span style={{ color: "#44406B" }}>·</span>
          <span>{dateStr}</span>
          <span style={{ color: "#44406B" }}>·</span>
          <span>
            {question._count.answers} réponse{question._count.answers > 1 ? "s" : ""}
          </span>
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
              isLast={i === question.answers.length - 1}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      <div
        style={{
          padding: "14px 22px",
          borderTop: question.answers.length > 0 ? "1px solid #1A1640" : "none",
        }}
      >
        <PostAnswerForm questionId={question.id} lessonSlug={lessonSlug} />
      </div>
    </div>
  );
}

function AnswerRow({
  answer,
  lessonSlug,
  isQuestionAuthor,
  isLast,
}: {
  answer: Answer;
  lessonSlug: string;
  isQuestionAuthor: boolean;
  isLast: boolean;
}) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    answer.createdAt,
  );

  return (
    <div
      style={{
        padding: "16px 22px 16px 38px",
        borderBottom: !isLast ? "1px solid #1A1640" : "none",
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
          color: "#B8B5D1",
          margin: "0 0 12px",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {answer.content}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <UserPill user={answer.user} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#44406B" }}>·</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6B6890" }}>
          {dateStr}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <UpvoteButton answerId={answer.id} lessonSlug={lessonSlug} upvotes={answer.upvotes} />
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

function UserPill({
  user,
}: {
  user: { displayName: string | null; username: string | null; level: number } | null;
}) {
  const name = user?.displayName ?? user?.username ?? "Utilisateur supprimé";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "#B8B5D1",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          background: user
            ? "linear-gradient(135deg, #0024FF, var(--cosmetic-accent))"
            : "linear-gradient(135deg, #3F3D5C, #2A2560)",
          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          color: "#030219",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span style={{ color: user ? "#F5F5FA" : "#6B6890", fontWeight: 600 }}>{name}</span>
      {user && (
        <span style={{ color: "var(--cosmetic-accent)", fontSize: 9 }}>LVL·{user.level}</span>
      )}
    </span>
  );
}
