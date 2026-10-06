import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/paths-catalog-v2.css";

/**
 * The paths catalogue while it loads, drawn on the page's own classes
 * (paths-catalog-v2.css): the breadcrumb, the header and its telemetry, the
 * filter bar, the path to resume with its cover, then the cards to discover,
 * each topped by its cover image.
 */

function SectionLabelSkeleton({
  tag,
  count,
}: {
  tag: number;
  count: number;
}): React.ReactElement {
  return (
    <div className="pc2-section" aria-hidden="true">
      <span className="pc2-section__tag">
        <Skeleton w={tag} h={12} />
      </span>
      <Skeleton w={count} h={11} />
      <span className="pc2-section__rule" />
    </div>
  );
}

/** A row of filter pills (.pills), each block the size of its pill. */
function PillsSkeleton({ widths }: { widths: readonly number[] }): React.ReactElement {
  return (
    <div className="pills">
      {widths.map((w, i) => (
        <Skeleton key={i} w={w} h={34} />
      ))}
    </div>
  );
}

/** One `.game-card`: the cover image, the title, two lines, the stats, the button. */
function GameCardSkeleton(): React.ReactElement {
  return (
    <div className="game-card" aria-hidden="true">
      <div className="game-card__cover game-card__cover--image">
        <Skeleton w="100%" h="100%" />
      </div>
      <div className="game-card__body">
        <Skeleton w="78%" h={19} />
        <SkeletonText lines={2} lastWidth="64%" lineHeight={12} gap={8} />
        <div className="game-card__stats">
          <Skeleton w={52} h={10} />
          <Skeleton w={30} h={10} />
          <Skeleton w={66} h={10} />
          <Skeleton w={40} h={10} />
        </div>
      </div>
      <div className="game-card__foot">
        <Skeleton w="100%" h={44} />
      </div>
    </div>
  );
}

export default function PathsLoading(): React.ReactElement {
  return (
    <div className="pc2-root" aria-busy="true" aria-label="Chargement des parcours">
      <div className="pc2">
        <div className="pg-crumb" aria-hidden="true">
          <Skeleton w={205} h={14} />
        </div>

        <header className="pc2-head" aria-hidden="true">
          <div>
            {/* .pc2-title: clamp(44px, 5.4vw, 76px), two balanced lines. */}
            <Skeleton w="82%" h="clamp(38px, 4.6vw, 64px)" style={{ marginBottom: 6 }} />
            <Skeleton w="60%" h="clamp(38px, 4.6vw, 64px)" style={{ marginBottom: 16 }} />
            <SkeletonText
              lines={2}
              lastWidth="58%"
              lineHeight={15}
              gap={10}
              style={{ maxWidth: 520 }}
            />
            <div className="pc2-guide">
              <Skeleton w={42} h={10} />
              <Skeleton w={360} h={13} style={{ maxWidth: "100%" }} />
            </div>
          </div>
          <div className="pc2-telemetry">
            <div className="pc2-telemetry__row">
              <Skeleton w={78} h={11} />
              <span className="pc2-telemetry__sep" />
              <Skeleton w={78} h={11} />
              <span className="pc2-telemetry__sep" />
              <Skeleton w={108} h={11} />
            </div>
            <div className="pc2-telemetry__rule" />
            <div className="pc2-telemetry__row">
              <Skeleton w={116} h={11} />
              <span className="pc2-telemetry__sep" />
              <Skeleton w={116} h={11} />
            </div>
          </div>
        </header>

        <div className="pc2-filters" aria-hidden="true">
          <Skeleton w={84} h={12} style={{ marginRight: 4 }} />
          <div className="pc2-filters__group">
            <PillsSkeleton widths={[80, 114, 72, 97]} />
          </div>
          <span className="pc2-filters__sep" />
          <Skeleton w={56} h={12} style={{ marginRight: 4 }} />
          <div className="pc2-filters__group">
            <PillsSkeleton widths={[80, 131, 97]} />
          </div>
          <span className="pc2-filters__sep" />
          <div className="pc2-search">
            <Skeleton w="100%" h={34} />
          </div>
        </div>

        <SectionLabelSkeleton tag={92} count={150} />
        {/* The accent modifier: the tint stays neutral while the category is unknown. */}
        <div className="hero-path hero-path--net" aria-hidden="true">
          <div className="hero-path__main">
            <div className="hero-path__topline">
              <Skeleton w={108} h={25} />
              <Skeleton w={96} h={25} />
              <Skeleton w={108} h={25} />
              <Skeleton w={110} h={25} />
              <Skeleton w={74} h={11} style={{ marginLeft: "auto" }} />
            </div>
            <Skeleton w="80%" h="clamp(30px, 3.2vw, 44px)" style={{ marginBottom: 6 }} />
            <Skeleton w="52%" h="clamp(30px, 3.2vw, 44px)" style={{ marginBottom: 16 }} />
            <SkeletonText
              lines={2}
              lastWidth="66%"
              lineHeight={14}
              gap={9}
              style={{ maxWidth: 540, marginBottom: 24 }}
            />
            <div className="hero-path__stats">
              <Skeleton w={86} h={12} />
              <Skeleton w={30} h={12} />
              <Skeleton w={76} h={12} />
              <Skeleton w={92} h={12} />
            </div>
            <div className="hero-path__foot">
              <div className="hero-prog">
                <Skeleton w={200} h={11} />
                <Skeleton w={44} h={18} />
              </div>
              <Skeleton h={12} />
              <div className="hero-path__cta-row">
                <Skeleton w={270} h={50} />
                <Skeleton w={110} h={50} />
              </div>
            </div>
          </div>
          <div className="hero-path__console hero-path__console--image">
            {/* The path's cover fills the console, under the next mission. */}
            <Skeleton style={{ position: "absolute", inset: 0 }} />
            <div className="hero-glyph" />
            <div className="hero-next">
              <Skeleton w={160} h={9} style={{ marginBottom: 10 }} />
              <Skeleton w="76%" h={16} style={{ marginBottom: 10 }} />
              <div className="hero-next__meta">
                <Skeleton w={110} h={10} />
                <Skeleton w={64} h={10} />
              </div>
            </div>
          </div>
        </div>

        <SectionLabelSkeleton tag={112} count={96} />
        <div className="pc2-discover">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
