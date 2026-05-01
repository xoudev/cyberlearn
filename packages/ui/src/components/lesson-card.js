"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonCard = LessonCard;
const jsx_runtime_1 = require("react/jsx-runtime");
// ── Design tokens — per CatalogGrid.jsx / catalog.css reference ───────────────
const CAT_META = {
  DEV: {
    label: "DEV",
    accent: "#6E8BFF",
    glow: "rgba(0,36,255,0.28)",
    tagColor: "#6E8BFF",
    tagBg: "rgba(0,36,255,0.1)",
    tagBorder: "rgba(110,139,255,0.45)",
  },
  CYBERSEC: {
    label: "CYBERSEC",
    accent: "#FF4757",
    glow: "rgba(255,71,87,0.22)",
    tagColor: "#FF4757",
    tagBg: "rgba(255,71,87,0.08)",
    tagBorder: "rgba(255,71,87,0.4)",
  },
  NETWORK: {
    label: "RÉSEAU",
    accent: "#0AFFD4",
    glow: "rgba(10,255,212,0.22)",
    tagColor: "#0AFFD4",
    tagBg: "rgba(10,255,212,0.07)",
    tagBorder: "rgba(10,255,212,0.4)",
  },
};
const DIFF_META = {
  BEGINNER: { label: "DÉBUTANT", bars: 1, color: "#0AFFD4" },
  INTERMEDIATE: { label: "INTERMÉDIAIRE", bars: 2, color: "#6E8BFF" },
  ADVANCED: { label: "AVANCÉ", bars: 3, color: "#FF4757" },
  EXPERT: { label: "EXPERT", bars: 3, color: "#FFB020" },
};
const STATUS_META = {
  NOT_STARTED: { label: "COMMENCER", color: "#6B6890" },
  IN_PROGRESS: { label: "EN COURS", color: "#0AFFD4" },
  COMPLETED: { label: "TERMINÉ", color: "#0AFFD4" },
};
// ── Category SVG icons — 64×64 from CatalogGrid.jsx reference ─────────────────
const SVG_BASE = { display: "block" };
const iconStroke = {
  fill: "none",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
function IconDev() {
  return (0, jsx_runtime_1.jsxs)("svg", {
    viewBox: "0 0 64 64",
    width: 64,
    height: 64,
    style: SVG_BASE,
    stroke: "currentColor",
    ...iconStroke,
    children: [
      (0, jsx_runtime_1.jsx)("path", { d: "M22 20 L8 32 L22 44" }),
      (0, jsx_runtime_1.jsx)("path", { d: "M42 20 L56 32 L42 44" }),
      (0, jsx_runtime_1.jsx)("path", { d: "M36 14 L28 50" }),
    ],
  });
}
function IconCyber() {
  return (0, jsx_runtime_1.jsxs)("svg", {
    viewBox: "0 0 64 64",
    width: 64,
    height: 64,
    style: SVG_BASE,
    stroke: "currentColor",
    ...iconStroke,
    children: [
      (0, jsx_runtime_1.jsx)("path", {
        d: "M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z",
      }),
      (0, jsx_runtime_1.jsx)("path", { d: "M24 32 L30 38 L42 24" }),
    ],
  });
}
function IconNetwork() {
  return (0, jsx_runtime_1.jsxs)("svg", {
    viewBox: "0 0 64 64",
    width: 64,
    height: 64,
    style: SVG_BASE,
    stroke: "currentColor",
    ...iconStroke,
    children: [
      (0, jsx_runtime_1.jsx)("circle", { cx: "32", cy: "14", r: "4" }),
      (0, jsx_runtime_1.jsx)("circle", { cx: "14", cy: "48", r: "4" }),
      (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "48", r: "4" }),
      (0, jsx_runtime_1.jsx)("path", { d: "M32 18 L14 44" }),
      (0, jsx_runtime_1.jsx)("path", { d: "M32 18 L50 44" }),
      (0, jsx_runtime_1.jsx)("path", { d: "M18 48 L46 48" }),
    ],
  });
}
const CAT_ICONS = {
  DEV: IconDev,
  CYBERSEC: IconCyber,
  NETWORK: IconNetwork,
};
// ── Sub-components ─────────────────────────────────────────────────────────────
function DiffBars({ filled, color }) {
  return (0, jsx_runtime_1.jsx)("span", {
    style: { display: "inline-flex", gap: 2, alignItems: "center" },
    children: [1, 2, 3].map((i) =>
      (0, jsx_runtime_1.jsx)(
        "span",
        { style: { width: 3, height: 8, background: i <= filled ? color : "#1A1840" } },
        i,
      ),
    ),
  });
}
function StatusIcon({ status }) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (status === "COMPLETED") {
    return (0, jsx_runtime_1.jsx)("svg", {
      viewBox: "0 0 16 16",
      width: 12,
      height: 12,
      ...s,
      children: (0, jsx_runtime_1.jsx)("path", { d: "M3 8 L7 12 L13 4" }),
    });
  }
  if (status === "IN_PROGRESS") {
    return (0, jsx_runtime_1.jsxs)("svg", {
      viewBox: "0 0 16 16",
      width: 12,
      height: 12,
      ...s,
      children: [
        (0, jsx_runtime_1.jsx)("circle", { cx: "8", cy: "8", r: "6" }),
        (0, jsx_runtime_1.jsx)("path", { d: "M8 4 V8 L11 10" }),
      ],
    });
  }
  return (0, jsx_runtime_1.jsx)("svg", {
    viewBox: "0 0 16 16",
    width: 12,
    height: 12,
    ...s,
    children: (0, jsx_runtime_1.jsx)("path", { d: "M4 3 V13 L12 8 Z" }),
  });
}
function LessonCard({
  title,
  description,
  difficulty,
  category,
  durationMinutes,
  xpReward,
  status = "NOT_STARTED",
  refCode,
  currentSection,
  totalSections,
  variant = "compact",
  wrapper,
}) {
  const catKey = category;
  const catMeta = catKey in CAT_META ? CAT_META[catKey] : CAT_META.DEV;
  // SAFETY: catKey guaranteed to be LessonCategory via catKey in CAT_META check
  const CatIcon = catKey in CAT_ICONS ? CAT_ICONS[catKey] : IconDev;
  const diffMeta = DIFF_META[difficulty];
  const card =
    variant === "catalog"
      ? (0, jsx_runtime_1.jsx)(CatalogCard, {
          title: title,
          catMeta: catMeta,
          catLabel: catMeta.label,
          CatIcon: CatIcon,
          diffMeta: diffMeta,
          status: status,
          xpReward: xpReward,
          ...(description !== undefined ? { description } : {}),
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(refCode !== undefined ? { refCode } : {}),
          ...(currentSection !== undefined ? { currentSection } : {}),
          ...(totalSections !== undefined ? { totalSections } : {}),
        })
      : (0, jsx_runtime_1.jsx)(CompactCard, {
          title: title,
          catMeta: catMeta,
          diffMeta: diffMeta,
          status: status,
          xpReward: xpReward,
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(description !== undefined ? { description } : {}),
        });
  return wrapper
    ? (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: wrapper(card) })
    : card;
}
// ── Catalog card — full reference design ──────────────────────────────────────
function CatalogCard({
  title,
  description,
  catMeta,
  catLabel,
  CatIcon,
  diffMeta,
  status,
  durationMinutes,
  xpReward,
  refCode,
  currentSection,
  totalSections,
}) {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";
  const statusMeta = STATUS_META[status];
  const pct =
    totalSections !== undefined && totalSections > 0 && currentSection !== undefined
      ? Math.round((currentSection / totalSections) * 100)
      : 0;
  const cardBorder = isInProgress
    ? "rgba(10,255,212,0.35)"
    : isCompleted
      ? "rgba(10,255,212,0.5)"
      : "#2A2560";
  const cardBoxShadow = isInProgress
    ? "inset 3px 0 0 #0AFFD4, 0 0 24px rgba(10,255,212,0.08)"
    : "none";
  const cardBg = isCompleted
    ? "linear-gradient(180deg, rgba(10,255,212,0.04), transparent 40%), #0A0826"
    : "#0A0826";
  return (0, jsx_runtime_1.jsxs)("article", {
    style: {
      position: "relative",
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 0,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      cursor: "pointer",
      transition: "border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
      boxShadow: cardBoxShadow,
    },
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.borderColor = isInProgress
        ? "rgba(10,255,212,0.6)"
        : isCompleted
          ? "rgba(10,255,212,0.7)"
          : "#3F3D5C";
      const bar = e.currentTarget.querySelector("[data-accent-bar]");
      if (bar instanceof HTMLElement && !isInProgress) bar.style.opacity = "0.6";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.borderColor = cardBorder;
      const bar = e.currentTarget.querySelector("[data-accent-bar]");
      if (bar instanceof HTMLElement && !isInProgress) bar.style.opacity = "0";
    },
    children: [
      (0, jsx_runtime_1.jsx)("span", {
        "data-accent-bar": "",
        "aria-hidden": "true",
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isInProgress ? 3 : 2,
          background: isInProgress ? "#0AFFD4" : catMeta.accent,
          opacity: isInProgress ? 1 : 0,
          transition: "opacity 180ms ease",
          pointerEvents: "none",
          zIndex: 4,
          boxShadow: isInProgress ? "0 0 12px #0AFFD4" : "none",
        },
      }),
      isCompleted &&
        (0, jsx_runtime_1.jsx)("span", {
          "aria-hidden": "true",
          style: {
            position: "absolute",
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            display: "grid",
            placeItems: "center",
            background: "#0AFFD4",
            color: "#030219",
            boxShadow: "0 0 16px rgba(10,255,212,0.55)",
            zIndex: 3,
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          },
          children: (0, jsx_runtime_1.jsx)("svg", {
            viewBox: "0 0 16 16",
            width: 12,
            height: 12,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2.2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: (0, jsx_runtime_1.jsx)("path", { d: "M3 8 L7 12 L13 4" }),
          }),
        }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
        },
        children: [
          (0, jsx_runtime_1.jsx)("span", {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 9px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              border: `1px solid ${catMeta.tagBorder}`,
              borderRadius: 0,
              color: catMeta.tagColor,
              background: catMeta.tagBg,
            },
            children: catLabel,
          }),
          (0, jsx_runtime_1.jsxs)("span", {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 9px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: diffMeta.color,
              background: "#05041A",
              border: "1px solid #2A2560",
              clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              ...(isCompleted ? { marginRight: 32 } : {}),
            },
            children: [
              (0, jsx_runtime_1.jsx)(DiffBars, { filled: diffMeta.bars, color: diffMeta.color }),
              (0, jsx_runtime_1.jsx)("span", { children: diffMeta.label }),
            ],
          }),
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          position: "relative",
          aspectRatio: "16 / 9",
          margin: "0 16px",
          background: "#05041A",
          border: "1px solid rgba(42,37,96,0.5)",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        },
        children: [
          (0, jsx_runtime_1.jsx)("span", {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(to right, rgba(42,37,96,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.6) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
            },
          }),
          (0, jsx_runtime_1.jsx)("span", {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${catMeta.glow}, transparent 70%)`,
              pointerEvents: "none",
            },
          }),
          (0, jsx_runtime_1.jsxs)("span", {
            style: {
              position: "absolute",
              top: 8,
              left: 8,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 9.5,
              letterSpacing: "0.14em",
              color: "#3F3D5C",
              background: "rgba(3,2,25,0.7)",
              padding: "2px 6px",
              border: "1px solid rgba(42,37,96,0.5)",
              zIndex: 2,
            },
            children: ["// ", catLabel],
          }),
          refCode !== undefined &&
            (0, jsx_runtime_1.jsx)("span", {
              style: {
                position: "absolute",
                top: 8,
                right: 8,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 9.5,
                letterSpacing: "0.1em",
                color: "#3F3D5C",
                zIndex: 2,
              },
              children: refCode,
            }),
          (0, jsx_runtime_1.jsx)("span", {
            style: {
              position: "relative",
              zIndex: 1,
              color: catMeta.accent,
              filter: `drop-shadow(0 0 12px ${catMeta.accent})`,
            },
            "aria-hidden": "true",
            children: (0, jsx_runtime_1.jsx)(CatIcon, {}),
          }),
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          padding: "16px 16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
        },
        children: [
          (0, jsx_runtime_1.jsx)("h3", {
            style: {
              fontFamily: "var(--font-display, sans-serif)",
              fontWeight: 700,
              fontSize: 17,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "#F5F5FA",
              margin: 0,
            },
            children: title,
          }),
          description !== undefined &&
            (0, jsx_runtime_1.jsx)("p", {
              style: {
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 13,
                lineHeight: 1.5,
                color: "#B8B5D1",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              },
              children: description,
            }),
        ],
      }),
      isInProgress &&
        totalSections !== undefined &&
        totalSections > 0 &&
        currentSection !== undefined &&
        (0, jsx_runtime_1.jsxs)("div", {
          style: { padding: "0 16px 14px" },
          children: [
            (0, jsx_runtime_1.jsxs)("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 6,
              },
              children: [
                (0, jsx_runtime_1.jsxs)("span", {
                  children: [
                    (0, jsx_runtime_1.jsxs)("b", {
                      style: { color: "#0AFFD4", fontWeight: 700 },
                      children: [currentSection, "/", totalSections],
                    }),
                    " SECTIONS",
                  ],
                }),
                (0, jsx_runtime_1.jsxs)("span", { children: [pct, "%"] }),
              ],
            }),
            (0, jsx_runtime_1.jsx)("div", {
              style: {
                position: "relative",
                height: 3,
                background: "#05041A",
                borderTop: "1px solid #2A2560",
                borderBottom: "1px solid #2A2560",
              },
              children: (0, jsx_runtime_1.jsx)("div", {
                style: {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${String(pct)}%`,
                  background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                  boxShadow: "0 0 8px rgba(10,255,212,0.6)",
                },
              }),
            }),
          ],
        }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          marginTop: "auto",
          padding: "12px 16px",
          borderTop: "1px solid rgba(42,37,96,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#3F3D5C",
        },
        children: [
          (0, jsx_runtime_1.jsxs)("span", {
            style: {
              color: "#0AFFD4",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            },
            children: [
              (0, jsx_runtime_1.jsx)("span", {
                style: {
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  transform: "rotate(45deg)",
                  background: "#0AFFD4",
                  boxShadow: "0 0 6px #0AFFD4",
                  flexShrink: 0,
                },
                "aria-hidden": "true",
              }),
              "+",
              xpReward,
              " XP",
            ],
          }),
          durationMinutes !== undefined &&
            (0, jsx_runtime_1.jsxs)("span", {
              style: { display: "inline-flex", alignItems: "center", gap: 6 },
              children: [
                (0, jsx_runtime_1.jsxs)("svg", {
                  viewBox: "0 0 16 16",
                  width: 11,
                  height: 11,
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 1.4,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  children: [
                    (0, jsx_runtime_1.jsx)("circle", { cx: "8", cy: "8", r: "6" }),
                    (0, jsx_runtime_1.jsx)("path", { d: "M8 4 V8 L11 10" }),
                  ],
                }),
                durationMinutes,
                " min",
              ],
            }),
          (0, jsx_runtime_1.jsxs)("span", {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: statusMeta.color,
            },
            children: [(0, jsx_runtime_1.jsx)(StatusIcon, { status: status }), statusMeta.label],
          }),
        ],
      }),
    ],
  });
}
// ── Compact card — minimal list view (used on dashboard, etc.) ────────────────
function CompactCard({ title, description, catMeta, diffMeta, status, durationMinutes, xpReward }) {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";
  return (0, jsx_runtime_1.jsxs)("div", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: 16,
      minHeight: 140,
      background: "#0A0826",
      border: "1px solid #2A2560",
      borderLeft: `3px solid ${catMeta.accent}`,
      borderRadius: 0,
    },
    children: [
      (0, jsx_runtime_1.jsx)("span", {
        "aria-hidden": "true",
        style: {
          position: "absolute",
          right: 12,
          top: 12,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isCompleted ? "#0AFFD4" : isInProgress ? "#0024FF" : "#2A2560",
          boxShadow: isCompleted
            ? "0 0 6px rgba(10,255,212,0.5)"
            : isInProgress
              ? "0 0 6px rgba(0,36,255,0.6)"
              : undefined,
        },
      }),
      (0, jsx_runtime_1.jsx)("h3", {
        style: {
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.35,
          color: "#F5F5FA",
          margin: 0,
          paddingRight: 20,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        },
        children: title,
      }),
      description !== undefined &&
        (0, jsx_runtime_1.jsx)("p", {
          style: {
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "#6B6890",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          },
          children: description,
        }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
        children: [
          (0, jsx_runtime_1.jsx)("span", {
            style: {
              padding: "2px 8px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: diffMeta.color,
              background: "rgba(5,4,26,0.9)",
              border: "1px solid #2A2560",
              borderRadius: 0,
            },
            children: diffMeta.label,
          }),
          (0, jsx_runtime_1.jsx)("span", {
            style: {
              padding: "2px 8px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: catMeta.tagColor,
              background: catMeta.tagBg,
              border: `1px solid ${catMeta.tagBorder}`,
              borderRadius: 0,
            },
            children: catMeta.label,
          }),
        ],
      }),
      (0, jsx_runtime_1.jsx)("div", { style: { flex: 1 } }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderTop: "1px solid #2A2560",
          paddingTop: 10,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          color: "#6B6890",
        },
        children: [
          durationMinutes !== undefined &&
            (0, jsx_runtime_1.jsxs)("span", {
              style: { display: "flex", alignItems: "center", gap: 4 },
              children: [
                (0, jsx_runtime_1.jsxs)("svg", {
                  viewBox: "0 0 16 16",
                  width: 11,
                  height: 11,
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 1.4,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  children: [
                    (0, jsx_runtime_1.jsx)("circle", { cx: "8", cy: "8", r: "6" }),
                    (0, jsx_runtime_1.jsx)("path", { d: "M8 4 V8 L11 10" }),
                  ],
                }),
                (0, jsx_runtime_1.jsxs)("span", {
                  style: { color: "#B8B5D1" },
                  children: [durationMinutes, " min"],
                }),
              ],
            }),
          (0, jsx_runtime_1.jsxs)("span", {
            style: { display: "flex", alignItems: "center", gap: 4 },
            children: [
              (0, jsx_runtime_1.jsx)("svg", {
                viewBox: "0 0 16 16",
                width: 11,
                height: 11,
                fill: "none",
                stroke: "#0AFFD4",
                strokeWidth: 1.6,
                children: (0, jsx_runtime_1.jsx)("polygon", {
                  points: "8,2 10,6 14.5,6.5 11,10 12,14.5 8,12 4,14.5 5,10 1.5,6.5 6,6",
                }),
              }),
              (0, jsx_runtime_1.jsxs)("span", {
                style: { color: "#0AFFD4", fontWeight: 700 },
                children: [xpReward, " XP"],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
//# sourceMappingURL=lesson-card.js.map
