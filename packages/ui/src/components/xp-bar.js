"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XPBar = XPBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_js_1 = require("../lib/utils.js");
/**
 * Displays a user's XP progress toward the next level.
 * The filled portion uses the brand turquoise gradient.
 */
function XPBar({ currentXP, xpForNextLevel, level, showValues = false, className }) {
  const percent = xpForNextLevel > 0 ? Math.min((currentXP / xpForNextLevel) * 100, 100) : 0;
  return (0, jsx_runtime_1.jsxs)("div", {
    className: (0, utils_js_1.cn)("w-full space-y-1", className),
    children: [
      (0, jsx_runtime_1.jsx)("div", {
        className: "h-2 w-full overflow-hidden rounded-full",
        style: { backgroundColor: "var(--color-border-default)" },
        role: "progressbar",
        "aria-valuenow": currentXP,
        "aria-valuemin": 0,
        "aria-valuemax": xpForNextLevel,
        "aria-label": `Niveau ${level} — ${currentXP} / ${xpForNextLevel} XP`,
        children: (0, jsx_runtime_1.jsx)("div", {
          className: "h-full rounded-full transition-[width] duration-500 ease-out",
          style: {
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-turquoise))",
          },
        }),
      }),
      showValues &&
        (0, jsx_runtime_1.jsxs)("p", {
          className: "text-xs",
          style: { color: "var(--color-text-muted)" },
          children: [
            currentXP.toLocaleString("fr-FR"),
            " / ",
            xpForNextLevel.toLocaleString("fr-FR"),
            " XP",
          ],
        }),
    ],
  });
}
//# sourceMappingURL=xp-bar.js.map
