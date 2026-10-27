import React from "react";
import Link from "next/link";
import { BastionLogo } from "@/components/bastion-logo";
import "./onboarding-shell.css";
import { ProgressBar } from "@/components/progress-bar";
import { OnboardingSignOut } from "./onboarding-sign-out";

const STEPS = ["Identité", "Avatar", "Objectif"] as const;

function OnboardingBar({ title }: { title: string }): React.ReactElement {
  return (
    <header className="ob-shell__bar">
      <Link href="/" className="ob-shell__brand" aria-label="CyberLearn · accueil">
        <BastionLogo size={28} /> CyberLearn<span>.</span>
      </Link>
      <span className="ob-shell__crumb">{title}</span>
      <div className="ob-shell__signout">
        <OnboardingSignOut />
      </div>
    </header>
  );
}

export function PlacementShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="ob-shell">
      <OnboardingBar title="Test de positionnement" />
      <main className="ob-shell__body">
        <section className="ob-placement">{children}</section>
      </main>
    </div>
  );
}
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
      <OnboardingBar title={`Bienvenue / ${stepName}`} />

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
          <ProgressBar value={step} max={STEPS.length} label={`Étape ${current} sur ${count}`} />
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

        <section className="ob-shell__panel" aria-label={panelTitle}>
          <div className="ob-shell__panel-head">
            <p className="ob-shell__panel-title">{panelTitle}</p>
            {panelTag !== undefined && <span>{panelTag}</span>}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
