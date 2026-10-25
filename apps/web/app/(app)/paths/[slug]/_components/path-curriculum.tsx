import React from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { moduleLabel, type ModuleGroup } from "@cyberlearn/lib/paths/modules";
import type { LockState } from "@cyberlearn/lib/paths/unlock";
import { difficultyMeta } from "@cyberlearn/lib/content/vocabulary";

interface MissionLesson {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
}

function Milestone({ state, number }: { state: LockState; number: string }): React.JSX.Element {
  if (state === "completed") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m4 10 4 4 8-8" />
      </svg>
    );
  }
  if (state === "locked") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="5" y="9" width="10" height="8" />
        <path d="M7 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    );
  }
  return <span>{number}</span>;
}

export function PathCurriculum({
  pathSlug,
  modules,
  lessons,
  states,
  resumeSlug,
}: {
  pathSlug: string;
  modules: readonly ModuleGroup[];
  lessons: readonly { lesson: MissionLesson }[];
  states: readonly LockState[];
  resumeSlug: string | null;
}): React.JSX.Element {
  return (
    <div className="path-map">
      {modules.map((module) => {
        const completed = module.indices.filter((index) => states[index] === "completed").length;
        const first = module.indices[0];
        const last = module.indices[module.indices.length - 1];
        const title =
          module.title ??
          (first === last
            ? `Leçon ${String((first ?? 0) + 1).padStart(2, "0")}`
            : `Leçons ${String((first ?? 0) + 1).padStart(2, "0")} à ${String((last ?? 0) + 1).padStart(2, "0")}`);
        return (
          <section
            className="path-module"
            key={module.key}
            aria-label={module.title ?? moduleLabel(module)}
          >
            <header className="path-module__head">
              <div>
                <p>{moduleLabel(module)}</p>
                <h3>{title}</h3>
                {module.description && (
                  <p className="path-module__description">{module.description}</p>
                )}
              </div>
              <span className="path-module__gate" aria-hidden="true" />
              <div className="path-module__tools">
                <span>
                  {completed}/{module.indices.length} terminée{module.indices.length > 1 ? "s" : ""}
                </span>
                <a
                  className="path-module__download"
                  href={`/api/paths/${pathSlug}/sheet?module=${String(module.number)}`}
                  download
                  title="La fiche de révision du module, en PDF"
                >
                  <FileDown size={16} strokeWidth={1.75} aria-hidden="true" /> Fiche PDF
                </a>
              </div>
            </header>
            <ol
              className="path-module__missions"
              aria-label={`Leçons de ${module.title ?? moduleLabel(module)}`}
            >
              {module.indices.map((index) => {
                const lesson = lessons[index]?.lesson;
                if (!lesson) return null;
                const state = states[index] ?? "locked";
                const current = lesson.slug === resumeSlug && state === "unlocked";
                const number = String(index + 1).padStart(2, "0");
                const previous = lessons[index - 1]?.lesson;
                const content = (
                  <>
                    <p className="path-mission__state">
                      <span>Mission {number}</span>
                      <span>
                        {state === "completed"
                          ? "Terminée"
                          : state === "locked"
                            ? "Verrouillée"
                            : current
                              ? "À suivre"
                              : "Disponible"}
                      </span>
                    </p>
                    <h4>{lesson.title}</h4>
                    <p className="path-mission__meta">
                      <span>{difficultyMeta(lesson.difficulty).label}</span>
                      <span>{lesson.estimatedMinutes} min</span>
                      <span>+{lesson.xpReward} XP</span>
                    </p>
                    {state === "locked" ? (
                      <p className="path-mission__requirement">
                        {previous
                          ? `À débloquer après « ${previous.title} ».`
                          : "Cette mission n’est pas encore accessible."}
                      </p>
                    ) : (
                      <span className="path-mission__action">
                        {state === "completed" ? "Revoir la mission" : "Ouvrir la leçon"}
                        <span aria-hidden="true">↗</span>
                      </span>
                    )}
                  </>
                );
                return (
                  <li
                    key={lesson.id}
                    className="path-map-row"
                    data-state={state}
                    data-side={index % 2 === 0 ? "left" : "right"}
                    data-current={current}
                    aria-current={current ? "step" : undefined}
                  >
                    <span className="path-map-node" aria-hidden="true">
                      <Milestone state={state} number={number} />
                    </span>
                    {state === "locked" ? (
                      <div className="path-mission">{content}</div>
                    ) : (
                      <Link className="path-mission" href={`/lessons/${lesson.slug}`}>
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
