import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type ContentCategory,
  isContentCategory,
} from "../content/vocabulary.js";

/**
 * The portfolio side of a public profile: what somebody can show for their
 * work, in words the site and the app share. Skills are read off what is
 * finished (lessons by category, paths completed), certificates get the link
 * that adds them to a LinkedIn profile, and nothing here touches a database.
 */

export interface SkillLine {
  category: ContentCategory;
  /** "Cybersécurité" */
  label: string;
  /** The short name, for a chip: "Cybersec". */
  short: string;
  color: string;
  /** Lessons finished in this category. */
  lessons: number;
  /** The titles of the paths completed in this category, most recent first as given. */
  paths: string[];
}

/**
 * One line per content category with something to show, in the catalogue's
 * order. A category the catalogue does not know is left out rather than
 * drawn without a name.
 */
export function skillLines(
  lessonsByCategory: readonly { category: string; count: number }[],
  completedPaths: readonly { title: string; category: string }[],
): SkillLine[] {
  return CATEGORY_ORDER.map((category): SkillLine | null => {
    const lessons = lessonsByCategory
      .filter((row) => row.category === category)
      .reduce((n, row) => n + row.count, 0);
    const paths = completedPaths.filter((p) => p.category === category).map((p) => p.title);
    if (lessons === 0 && paths.length === 0) return null;
    const meta = CATEGORY_META[category];
    return { category, label: meta.label, short: meta.short, color: meta.color, lessons, paths };
  }).filter((line): line is SkillLine => line !== null);
}

/** "12 leçons terminées", "1 leçon terminée". */
export function lessonsFinishedLabel(count: number): string {
  return `${String(count)} leçon${count > 1 ? "s" : ""} terminée${count > 1 ? "s" : ""}`;
}

/** The public page that proves a certificate, from the site's origin. */
export function certificateVerifyUrl(siteUrl: string, publicId: string): string {
  return `${siteUrl.replace(/\/+$/u, "")}/verify/${encodeURIComponent(publicId)}`;
}

export interface CertificateToAdd {
  /** The certificate's name on LinkedIn: the path's title. */
  name: string;
  issuedAt: Date | string;
  publicId: string;
  verifyUrl: string;
}

/**
 * The link LinkedIn documents for adding a certification to a profile, with
 * the name, the issuer, the month and year, and the public page and id that
 * let anyone verify it. Opened by the holder, who then confirms on LinkedIn.
 */
export function linkedInCertificateUrl(
  certificate: CertificateToAdd,
  organization = "CyberLearn",
): string {
  const issued = new Date(certificate.issuedAt);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certificate.name,
    organizationName: organization,
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: certificate.verifyUrl,
    certId: certificate.publicId,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** Whether a category name is one the portfolio can file a line under. */
export function isPortfolioCategory(value: string): value is ContentCategory {
  return isContentCategory(value);
}
