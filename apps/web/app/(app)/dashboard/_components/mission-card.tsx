import React from "react";
import Link from "next/link";
import type { ModuleRoute } from "@cyberlearn/lib/dashboard/module-route";

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
 * Text on the left, the module on the right as a row of lessons - done, now,
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
        <div className="dash-now-label">
          {eyebrow}
          {context !== null && <span>{context}</span>}
        </div>
        <h2 id="dash-now-title">{title}</h2>
        {description !== null && description !== "" && <p>{description}</p>}
        <div className="dash-now-foot">
          <Link href={cta.href} className="btn btn--accent">
            {cta.label}
            <svg
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7h8M8 4l3 3-3 3" />
            </svg>
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

/** The module as a track: a line, and a node per lesson that links to it. */
function RouteView({
  route,
  path,
}: {
  route: ModuleRoute;
  path: MissionCardProps["path"];
}): React.JSX.Element {
  const count = route.nodes.length;
  const nowIndex = route.nodes.findIndex((node) => node.state === "now");
  // The lit part of the line runs up to the lesson being offered; with none
  // offered the module is finished and the whole line is lit.
  const litUpTo = nowIndex === -1 ? count - 1 : nowIndex;
  const litPercent = count > 1 ? (litUpTo / (count - 1)) * 100 : 0;

  return (
    <div
      className="dash-route"
      role="group"
      aria-label={`${route.label} : ${String(route.done)} leçon${route.done > 1 ? "s" : ""} sur ${String(route.total)} faite${route.done > 1 ? "s" : ""}`}
    >
      <div className="dash-route-head">
        <span>{route.label}</span>
        <span className="dash-num">
          {route.done} / {route.total}
        </span>
      </div>
      <div className="dash-route-track">
        {count > 1 && (
          <>
            <i className="dash-route-line" aria-hidden="true" />
            <i
              className="dash-route-lit"
              style={{ width: `${litPercent.toFixed(1)}%` }}
              aria-hidden="true"
            />
          </>
        )}
        {route.nodes.map((node) => (
          <Link
            key={node.id}
            href={`/lessons/${node.slug}`}
            className={`dash-node dash-node--${node.state}`}
            title={node.title}
            aria-label={`${node.title}${node.state === "done" ? ", faite" : node.state === "now" ? ", en cours" : ""}`}
            aria-current={node.state === "now" ? "step" : undefined}
          />
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
