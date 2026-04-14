"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RarityBadge = RarityBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const class_variance_authority_1 = require("class-variance-authority");
const utils_js_1 = require("../lib/utils.js");
const RARITY_LABELS = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};
const rarityBadgeVariants = (0, class_variance_authority_1.cva)(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      rarity: {
        COMMON: "",
        RARE: "",
        EPIC: "",
        LEGENDARY: "",
      },
    },
    defaultVariants: {
      rarity: "COMMON",
    },
  },
);
const RARITY_STYLES = {
  COMMON: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-common) 15%, transparent)",
    color: "var(--color-rarity-common)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-common) 30%, transparent)",
  },
  RARE: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-rare) 15%, transparent)",
    color: "var(--color-rarity-rare)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-rare) 30%, transparent)",
  },
  EPIC: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-epic) 15%, transparent)",
    color: "var(--color-rarity-epic)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-epic) 30%, transparent)",
  },
  LEGENDARY: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-legendary) 15%, transparent)",
    color: "var(--color-rarity-legendary)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-legendary) 30%, transparent)",
  },
};
function RarityBadge({ rarity, showDot = false, className }) {
  return (0, jsx_runtime_1.jsxs)("span", {
    className: (0, utils_js_1.cn)(rarityBadgeVariants({ rarity }), className),
    style: RARITY_STYLES[rarity],
    children: [
      showDot &&
        (0, jsx_runtime_1.jsx)("span", {
          className: "h-1.5 w-1.5 rounded-full",
          style: { backgroundColor: "currentColor" },
          "aria-hidden": "true",
        }),
      RARITY_LABELS[rarity],
    ],
  });
}
//# sourceMappingURL=rarity-badge.js.map
