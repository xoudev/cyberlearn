import React from "react";
import Link from "next/link";
import type { ModuleRoute } from "@cyberlearn/lib/dashboard/module-route";
import { ArrowUpRight } from "lucide-react";
import { BastionLogo } from "@/components/bastion-logo";

export interface MissionCardProps {
  /** "Leçon en cours", "Prochaine mission", "Première mission"... */
  eyebrow: string;
  /** The path the lesson belongs to, or what stands in for it. */
  context: string | null;
  title: string;
  description: string | null;
  /** The one button. */
  cta: { href: string; label: string };
  /** "25 min · +120 XP", beside the button. */
  meta: string | null;
  /** A quiet link on the right: "Tous les parcours". */
  aside: { href: string; label: string } | null;
  /** The module being walked, when there is a path to walk. */
  route: ModuleRoute | null;
  /** How far into the whole path, under the route. */
  path: { completed: number; total: number; href: string } | null;
}

/**
 * The one strong card on the page: what to do next, and where it sits.
 *
 * Text on the left, the module on the right as a sequence of lessons - done, now,
 * to come. It is the only card that gets an accent, because it is the only
 * thing the page asks the reader to do.
 */
export function MissionCard(props: MissionCardProps): React.JSX.Element {
  const { eyebrow, context, title, description, cta, meta, aside, route, path } = props;
  return (
    <section
      className={`dash-now${route ? "" : " dash-now--text"}`}
      aria-labelledby="dash-now-title"
    >
      <div className="dash-now-main">
        <div className="learning-mission-kicker">
          <span>Sur le terrain</span>
          <span>Comprendre / Pratiquer / Progresser</span>
        </div>
        <div className="learning-mission-brand" aria-hidden="true">
          <BastionLogo size={160} />
        </div>
        <div className="dash-now-label">
          {eyebrow}
          {context !== null && <span>{context}</span>}
        </div>
        <h2 id="dash-now-title">{title}</h2>
        {description !== null && description !== "" && <p>{description}</p>}
        <div className="dash-now-foot">
          <Link href={cta.href} className="btn btn--accent">
            {cta.label}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          {meta !== null && <span className="dash-now-meta">{meta}</span>}
          {aside !== null && (
            <Link href={aside.href} className="dash-now-aside">
              {aside.label}
            </Link>
          )}
        </div>
      </div>
      {route !== null && <RouteView route={route} path={path} />}
    </section>
  );
}

/** The module as an interactive sequence: done, active, and upcoming lessons. */
function RouteView({
  route,
  path,
}: {
  route: ModuleRoute;
  path: MissionCardProps["path"];
}): React.JSX.Element {
  return (
    <div
      className="dash-route"
      role="group"
      aria-label={`${route.label} : ${String(route.done)} leçon${route.done > 1 ? "s" : ""} sur ${String(route.total)} faite${route.done > 1 ? "s" : ""}`}
    >
      <div className="dash-route-head">
        <span>
          Ton itinéraire <b>{route.label}</b>
        </span>
        <span className="dash-num">
          {route.done} / {route.total} validées
        </span>
      </div>
      <div className="learning-route-progress" aria-hidden="true">
        <span
          style={{ width: `${String(route.total > 0 ? (route.done / route.total) * 100 : 0)}%` }}
        />
      </div>
      <div className="dash-route-nodes">
        {route.nodes.map((node, index) => (
          <Link
            key={node.id}
            href={`/lessons/${node.slug}`}
            className={`dash-chapter-node dash-chapter-node--${node.state}`}
            title={node.title}
            aria-label={`${node.title}${node.state === "done" ? ", faite" : node.state === "now" ? ", en cours" : ""}`}
            aria-current={node.state === "now" ? "step" : undefined}
          >
            <div className="dash-chapter-node-top">
              <span className="dash-chapter-node-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="dash-chapter-node-icon" aria-hidden="true">
                {node.state === "done" ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : node.state === "now" ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="11" width="14" height="9" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                )}
              </span>
            </div>
            <span className="dash-chapter-node-title">{node.title}</span>
            <span className="learning-chapter-state">
              {node.state === "done" ? "Validée" : node.state === "now" ? "En cours" : "À suivre"}
            </span>
          </Link>
        ))}
      </div>
      {path !== null && (
        <div className="dash-route-foot">
          <span className="dash-num">
            <b>{path.completed}</b> / {path.total} leçons du parcours
          </span>
          <Link href={path.href}>Voir le parcours</Link>
        </div>
      )}
    </div>
  );
}
