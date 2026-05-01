"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathProgress = PathProgress;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const utils_js_1 = require("../lib/utils.js");
/**
 * Displays progress through a learning path.
 * "bar" variant: progress bar + fraction.
 * "compact" variant: fraction and small pill.
 */
function PathProgress({ completedLessons, totalLessons, pathName, variant = "bar", className }) {
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = percent === 100;
  if (variant === "compact") {
    return (0, jsx_runtime_1.jsxs)("div", {
      className: (0, utils_js_1.cn)("flex items-center gap-2", className),
      children: [
        isComplete
          ? (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, {
              size: 14,
              style: { color: "var(--color-success)" },
            })
          : (0, jsx_runtime_1.jsx)(lucide_react_1.Circle, {
              size: 14,
              style: { color: "var(--color-text-muted)" },
            }),
        (0, jsx_runtime_1.jsxs)("span", {
          className: "text-xs",
          style: { color: "var(--color-text-muted)" },
          children: [completedLessons, "/", totalLessons, " le\u00E7ons"],
        }),
      ],
    });
  }
  return (0, jsx_runtime_1.jsxs)("div", {
    className: (0, utils_js_1.cn)("space-y-2", className),
    children: [
      pathName &&
        (0, jsx_runtime_1.jsx)("p", {
          className: "text-sm font-medium",
          style: { color: "var(--color-text-primary)" },
          children: pathName,
        }),
      (0, jsx_runtime_1.jsxs)("div", {
        className: "flex items-center gap-3",
        children: [
          (0, jsx_runtime_1.jsx)("div", {
            className: "h-2 flex-1 overflow-hidden rounded-full",
            style: { backgroundColor: "var(--color-border-default)" },
            role: "progressbar",
            "aria-valuenow": completedLessons,
            "aria-valuemin": 0,
            "aria-valuemax": totalLessons,
            "aria-label": `${String(percent)}% du parcours complété`,
            children: (0, jsx_runtime_1.jsx)("div", {
              className: "h-full rounded-full transition-[width] duration-700 ease-out",
              style: {
                width: `${String(percent)}%`,
                background: isComplete
                  ? "var(--color-success)"
                  : "linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-turquoise))",
              },
            }),
          }),
          (0, jsx_runtime_1.jsxs)("span", {
            className: "shrink-0 text-xs tabular-nums",
            style: { color: "var(--color-text-muted)" },
            children: [completedLessons, "/", totalLessons],
          }),
        ],
      }),
    ],
  });
}
//# sourceMappingURL=path-progress.js.map
