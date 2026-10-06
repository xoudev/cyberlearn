import React from "react";
import { PublicNavbar } from "@/app/_components/public-navbar";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "@/app/(app)/paths/_components/paths-catalog-v2.css";
import "./catalogue.css";

/**
 * The public catalogue while it loads, drawn on the page's own classes
 * (catalogue.css and the paths' paths-catalog-v2.css): the public navbar,
 * which is static and drawn as is, the crumb, the hero and its two counts,
 * the category pills and the search box, the result count, and six path cards
 * (.pc2-discover of .game-card: cover, title, description, stats, button).
 */

/** One .game-card: the cover picture, the body, the full-width button. */
function PathCardSkeleton({ title }: { title: string }): React.ReactElement {
  return (
    <div className="game-card">
      <div className="game-card__cover game-card__cover--image">
        <Skeleton style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="game-card__body">
        <Skeleton w={title} h={19} style={{ margin: "1px 0 2px" }} />
        <SkeletonText lines={2} lastWidth="65%" lineHeight={12} gap={7} />
        <div className="game-card__stats">
          <Skeleton w={62} h={10} />
          <Skeleton w={36} h={10} />
          <Skeleton w={70} h={10} />
        </div>
      </div>
      <div className="game-card__foot">
        <Skeleton h={44} />
      </div>
    </div>
  );
}

export default function CatalogueLoading(): React.ReactElement {
  return (
    <div className="public-catalogue" aria-busy="true" aria-label="Chargement du catalogue">
      <PublicNavbar />

      <main className="public-catalogue__main" aria-hidden="true">
        <div className="public-catalogue__crumb">
          <Skeleton w={210} h={10} style={{ margin: "2px 0" }} />
        </div>

        <section className="public-catalogue__hero">
          <div>
            <Skeleton w={130} h={10} style={{ margin: "2px 0" }} />
            {/* The title's two word groups, sized in em on the h1's own font
                size and max-width, so they wrap onto two lines where it does. */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.16em 0.28em",
                maxWidth: 780,
                margin: "12px 0 18px",
                padding: "0.08em 0",
                fontSize: "clamp(44px, 6vw, 82px)",
              }}
            >
              <Skeleton w="5.5em" h="0.8em" style={{ maxWidth: "100%" }} />
              <Skeleton w="4.5em" h="0.8em" style={{ maxWidth: "100%" }} />
            </div>
            <SkeletonText
              lines={2}
              lastWidth="58%"
              lineHeight={15}
              gap={11}
              style={{ maxWidth: 650 }}
            />
          </div>
          <dl>
            <div>
              <dt>
                <Skeleton w={62} h={9} style={{ margin: "2px 0" }} />
              </dt>
              <dd>
                <Skeleton w={36} h={28} style={{ margin: "3px 0" }} />
              </dd>
            </div>
            <div>
              <dt>
                <Skeleton w={62} h={9} style={{ margin: "2px 0" }} />
              </dt>
              <dd>
                <Skeleton w={20} h={28} style={{ margin: "3px 0" }} />
              </dd>
            </div>
          </dl>
        </section>

        <section className="public-catalogue__filters">
          <div className="public-catalogue__pills">
            <Skeleton w={69} h={42} />
            <Skeleton w={100} h={42} />
            <Skeleton w={61} h={42} />
            <Skeleton w={84} h={42} />
          </div>
          {/* The search box: min(310px, 38vw) beside the pills, the whole
              line once the filters stack (max-width: 720px), as the input is. */}
          <Skeleton
            h={42}
            style={{
              width: "max(min(310px, 38vw), calc((721px - 100vw) * 1000))",
              maxWidth: "100%",
            }}
          />
        </section>

        <div className="public-catalogue__result-count">
          <Skeleton w={140} h={10} style={{ margin: "2px 0" }} />
        </div>

        <section className="public-catalogue__paths pc2-root">
          <div className="pc2-discover">
            {["78%", "64%", "84%", "70%", "58%", "76%"].map((title) => (
              <PathCardSkeleton key={title} title={title} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
