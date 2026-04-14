"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonCard = LessonCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const utils_js_1 = require("../lib/utils.js");
const rarity_badge_js_1 = require("./rarity-badge.js");
const DIFFICULTY_LABELS = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};
const DIFFICULTY_COLORS = {
  BEGINNER: "var(--color-success)",
  INTERMEDIATE: "var(--color-info)",
  ADVANCED: "var(--color-warning)",
  EXPERT: "var(--color-danger)",
};
/**
 * Card component for a lesson.
 * Designed for use in lesson lists and path detail pages.
 */
function LessonCard({
  title,
  difficulty,
  durationMinutes,
  xpReward,
  status = "NOT_STARTED",
  category,
  wrapper,
  className,
}) {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";
  const card = (0, jsx_runtime_1.jsxs)("div", {
    className: (0, utils_js_1.cn)(
      "group relative flex flex-col gap-3 rounded-xl p-4 transition-all duration-200",
      "hover:translate-y-[-2px]",
      className,
    ),
    style: {
      backgroundColor: "var(--color-bg-elevated)",
      border: `1px solid ${isCompleted ? "var(--color-success)" : "var(--color-border-default)"}`,
      boxShadow: isCompleted
        ? "0 0 0 1px color-mix(in srgb, var(--color-success) 20%, transparent)"
        : undefined,
    },
    children: [
      isCompleted &&
        (0, jsx_runtime_1.jsx)("div", {
          className:
            "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
          style: { backgroundColor: "var(--color-success)", color: "var(--color-bg-base)" },
          "aria-label": "Le\u00E7on compl\u00E9t\u00E9e",
          children: "\u2713",
        }),
      isInProgress &&
        (0, jsx_runtime_1.jsx)("div", {
          className: "absolute right-3 top-3 h-2 w-2 rounded-full",
          style: { backgroundColor: "var(--color-brand-turquoise)" },
          "aria-label": "Le\u00E7on en cours",
        }),
      (0, jsx_runtime_1.jsxs)("div", {
        className: "flex items-start gap-2 pr-6",
        children: [
          (0, jsx_runtime_1.jsx)(lucide_react_1.BookOpen, {
            size: 16,
            className: "mt-0.5 shrink-0",
            style: { color: "var(--color-text-muted)" },
          }),
          (0, jsx_runtime_1.jsx)("h3", {
            className: "line-clamp-2 text-sm font-semibold leading-snug",
            style: { color: "var(--color-text-primary)" },
            children: title,
          }),
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        className: "flex flex-wrap items-center gap-2",
        children: [
          (0, jsx_runtime_1.jsx)("span", {
            className: "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            style: {
              backgroundColor: `color-mix(in srgb, ${DIFFICULTY_COLORS[difficulty]} 15%, transparent)`,
              color: DIFFICULTY_COLORS[difficulty],
            },
            children: DIFFICULTY_LABELS[difficulty],
          }),
          category &&
            (0, jsx_runtime_1.jsx)(rarity_badge_js_1.RarityBadge, {
              rarity: "COMMON",
              className: "text-[10px]",
            }),
          category &&
            (0, jsx_runtime_1.jsx)("span", {
              className: "rounded-full px-2 py-0.5 text-[10px] font-medium",
              style: {
                backgroundColor: "var(--color-bg-overlay)",
                color: "var(--color-text-muted)",
              },
              children: category,
            }),
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        className: "flex items-center gap-3 border-t pt-3 text-xs",
        style: {
          borderColor: "var(--color-border-subtle)",
          color: "var(--color-text-muted)",
        },
        children: [
          durationMinutes &&
            (0, jsx_runtime_1.jsxs)("span", {
              className: "flex items-center gap-1",
              children: [
                (0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 11 }),
                durationMinutes,
                " min",
              ],
            }),
          (0, jsx_runtime_1.jsxs)("span", {
            className: "flex items-center gap-1 font-medium",
            style: { color: "var(--color-warning)" },
            children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Zap, { size: 11 }), xpReward, " XP"],
          }),
        ],
      }),
    ],
  });
  return wrapper
    ? (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: wrapper(card) })
    : card;
}
//# sourceMappingURL=lesson-card.js.map
