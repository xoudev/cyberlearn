import { categoryMeta } from "@cyberlearn/lib/content/vocabulary";
import { BastionLogo } from "./bastion-logo";

/** The existing brand mark and actual content category form a course's poster. */
export function CatalogueArtwork({
  category,
  reference,
  coverSrc,
}: {
  category: string;
  reference: string;
  coverSrc?: string | null;
}): React.ReactElement {
  return (
    <div className="catalogue-artwork" data-category={category} aria-hidden="true">
      {coverSrc && (
        <span
          className="catalogue-artwork__cover"
          style={{ backgroundImage: `url("${coverSrc}")` }}
        />
      )}
      <div className="catalogue-artwork__brand">
        <BastionLogo size={190} />
      </div>
      <svg className="catalogue-artwork__axes" viewBox="0 0 400 340" fill="none">
        <path pathLength="1" d="M0 305H82L200 237V102L374 2M200 237L400 340M200 102L24 0" />
      </svg>
      <span className="catalogue-artwork__reference">{reference}</span>
      <span className="catalogue-artwork__domain">{categoryMeta(category).short}</span>
      <span className="catalogue-artwork__signature">Bastion / CyberLearn</span>
    </div>
  );
}
