import React from "react";

/**
 * What the mock exam's two halves share: its presentation, in a window on the
 * path's page (paths/[slug]/_components/mock-exam-dialog.tsx), and the exam
 * itself, on its own page (mock-exam-flow.tsx).
 */

/** "1 question", "2 questions": the word as the count wants it. */
export function plural(n: number, word: string): string {
  return n > 1 ? `${word}s` : word;
}

// ── Icons (decorative: every one sits beside the words it illustrates) ──────

function Svg({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconClock = (): React.ReactElement => (
  <Svg>
    <circle cx="8" cy="9" r="5.2" />
    <path d="M8 6.6V9l1.8 1.3M6.2 2.5h3.6" />
  </Svg>
);
export const IconPaper = (): React.ReactElement => (
  <Svg>
    <path d="M3.5 1.8h6.2l2.8 2.8v9.6h-9zM5.8 7.5h4.4M5.8 10.2h4.4" />
  </Svg>
);
export const IconCheck = (): React.ReactElement => (
  <Svg>
    <path d="M3 8.5 6.5 12 13 4.5" />
  </Svg>
);
export const IconCross = (): React.ReactElement => (
  <Svg>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);
export const IconDash = (): React.ReactElement => (
  <Svg>
    <path d="M4 8h8" />
  </Svg>
);
export const IconArrowRight = (): React.ReactElement => (
  <Svg>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);
export const IconArrowLeft = (): React.ReactElement => (
  <Svg>
    <path d="M13 8H3m4-4L3 8l4 4" />
  </Svg>
);
export const IconChevron = (): React.ReactElement => (
  <Svg>
    <path d="m6 3 5 5-5 5" />
  </Svg>
);
export const IconInfo = (): React.ReactElement => (
  <Svg>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.2v4M8 4.8v.2" />
  </Svg>
);
