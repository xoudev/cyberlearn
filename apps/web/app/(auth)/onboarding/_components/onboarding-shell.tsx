import React from "react";
import Image from "next/image";
import "./onboarding-shell.css";

const STEPS = ["Identité", "Avatar", "Objectif"] as const;

const CORNERS = ["tl", "tr", "bl", "br"] as const;

/**
 * The frame of an onboarding step: top bar, progress over the three steps,
 * and the bracketed panel the step's content sits in.
 */
export function OnboardingShell({
  step,
  stepName,
  panelTitle,
  panelTag,
  children,
}: {
  /** 1-based index into the three steps. */
  step: 1 | 2 | 3;
  stepName: string;
  panelTitle: string;
  panelTag?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const count = String(STEPS.length).padStart(2, "0");
  const current = String(step).padStart(2, "0");
  return (
    <div className="ob-shell">
      <div aria-hidden="true" className="ob-shell__glow" />
      <div aria-hidden="true" className="ob-shell__grid" />

      <header className="ob-shell__bar">
        <Image src="/icon_app.png" alt="CyberLearn" width={20} height={20} priority />
        <span className="ob-shell__brand">
          cyber<b>learn</b>
        </span>
        <span className="ob-shell__slash">/</span>
        <span className="ob-shell__crumb">Onboarding · {stepName}</span>
      </header>

      <main className="ob-shell__body">
        <div className="ob-shell__progress">
          <div className="ob-shell__progress-head">
            <span>
              <span className="ob-shell__step">
                Étape <b>{current}</b> / {count}
              </span>{" "}
              · <b>{stepName}</b>
            </span>
          </div>
          <div className="ob-shell__track">
            <div
              className="ob-shell__track-fill"
              style={{ width: `${String(Math.round((step / STEPS.length) * 100))}%` }}
            />
          </div>
          <ol className="ob-shell__ticks">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="ob-shell__tick"
                data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "pending"}
                aria-current={i + 1 === step ? "step" : undefined}
              >
                {label}
              </li>
            ))}
          </ol>
        </div>

        <section className="ob-shell__panel">
          {CORNERS.map((c) => (
            <span
              key={c}
              aria-hidden="true"
              className={`ob-shell__corner ob-shell__corner--${c}`}
            />
          ))}
          <div className="ob-shell__panel-head">
            <h2 className="ob-shell__panel-title">
              <b>›</b> {panelTitle}
            </h2>
            {panelTag !== undefined && <span>{panelTag}</span>}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
