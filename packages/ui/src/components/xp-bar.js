"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XPBar = XPBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const utils_js_1 = require("../lib/utils.js");
function XPBar({ currentXP, xpForNextLevel, level, showValues = false, className }) {
  const target = xpForNextLevel > 0 ? Math.min((currentXP / xpForNextLevel) * 100, 100) : 0;
  const [width, setWidth] = (0, react_1.useState)(0);
  (0, react_1.useEffect)(() => {
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (0, jsx_runtime_1.jsxs)("div", {
    className: (0, utils_js_1.cn)("w-full space-y-1.5", className),
    children: [
      showValues &&
        (0, jsx_runtime_1.jsxs)("div", {
          className: "flex items-center justify-between font-mono text-xs",
          style: { color: "#6B6890" },
          children: [
            (0, jsx_runtime_1.jsxs)("span", {
              children: [
                (0, jsx_runtime_1.jsx)("span", {
                  style: { color: "#0AFFD4" },
                  children: currentXP.toLocaleString("fr-FR"),
                }),
                " / ",
                xpForNextLevel.toLocaleString("fr-FR"),
                " XP",
              ],
            }),
            (0, jsx_runtime_1.jsxs)("span", { children: ["Niv. ", level + 1] }),
          ],
        }),
      (0, jsx_runtime_1.jsx)("div", {
        role: "progressbar",
        "aria-valuenow": currentXP,
        "aria-valuemin": 0,
        "aria-valuemax": xpForNextLevel,
        "aria-label": `Niveau ${level} — ${currentXP} / ${xpForNextLevel} XP`,
        className: "h-2 w-full overflow-hidden rounded-full",
        style: { backgroundColor: "#1F1B47" },
        children: (0, jsx_runtime_1.jsx)("div", {
          className: "h-full rounded-full",
          style: {
            width: `${width}%`,
            background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
            boxShadow: "0 0 12px rgba(10,255,212,0.5)",
            transition: "width 800ms ease-out",
          },
        }),
      }),
    ],
  });
}
//# sourceMappingURL=xp-bar.js.map
