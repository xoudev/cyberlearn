"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelBadge = LevelBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const class_variance_authority_1 = require("class-variance-authority");
const utils_js_1 = require("../lib/utils.js");
const levelBadgeVariants = (0, class_variance_authority_1.cva)(
  "inline-flex items-center gap-1 font-bold tabular-nums select-none",
  {
    variants: {
      size: {
        sm: "rounded-full h-5 px-2 text-[9px] tracking-wide",
        md: "rounded-lg h-7 px-2.5 text-xs tracking-wide",
        lg: "rounded-xl h-9 px-3 text-sm tracking-wide",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);
/**
 * Badge showing the user's current level.
 * sm: compact pill (number only). md/lg: pill with "NV." prefix.
 */
function LevelBadge({ level, size, className }) {
  const showLabel = size !== "sm";
  return (0, jsx_runtime_1.jsxs)("span", {
    className: (0, utils_js_1.cn)(levelBadgeVariants({ size }), className),
    style: {
      background: "linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-turquoise))",
      color: "#ffffff",
      boxShadow:
        "0 1px 3px color-mix(in srgb, var(--color-brand-blue) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
    },
    "aria-label": `Niveau ${String(level)}`,
    children: [
      showLabel &&
        (0, jsx_runtime_1.jsx)("span", {
          style: {
            fontSize: "0.65em",
            opacity: 0.85,
            fontWeight: 600,
            letterSpacing: "0.08em",
            lineHeight: 1,
          },
          children: "NV.",
        }),
      (0, jsx_runtime_1.jsx)("span", { style: { lineHeight: 1 }, children: level }),
    ],
  });
}
//# sourceMappingURL=level-badge.js.map
