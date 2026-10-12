import React from "react";
import type { Metadata } from "next";
import { splitMdxSections } from "@cyberlearn/lib";
import { lessonPreviewRepository } from "@cyberlearn/db";
import { LESSON_MDX_COMPONENTS } from "../../(app)/lessons/[slug]/_components/lesson-mdx-components";
import { LESSON_MDX_OPTIONS } from "../../(app)/lessons/[slug]/_components/lesson-mdx-options";
import { LessonSection } from "../../(app)/lessons/[slug]/_components/lesson-section";
import { SectionPane } from "../../(app)/lessons/[slug]/_components/section-pane";
import { LESSON_ARTICLE_CLASS } from "../../(app)/lessons/[slug]/_components/lesson-article";
import { PreviewScroll } from "./_components/preview-scroll";

/**
 * A draft, drawn by the site for the editor that wrote it.
 *
 * The lesson editor used to show an approximation of the page: a handful of
 * components sketched with regular expressions, every other one reduced to its
 * tag. What an author composed against was not what the learners got. This
 * page is the real thing: the same components, options and section renderer
 * as the lesson page, over the draft the editor sent (lesson-preview
 * repository), inside the editor's frame.
 *
 * Everything the lesson page does besides drawing is left out: no progress
 * row, no XP, no stepper and no toolbar (every section is on the page, one
 * under the other, so the author scrolls instead of clicking through), no
 * quiz provider (a quiz then scores on the page and records nothing), no
 * notes, rating or Q&A. The column is the page's: the same `.lesson-page`
 * and the same article classes, so the prose keeps the page's measure and a
 * component the article's width.
 *
 * Outside the (app) layout on purpose: a frame 600 pixels wide has no room for
 * a sidebar, and the page must work without a session on this site, which the
 * console's editor does not have. The token in the address is the credential,
 * and the middleware lets this route be framed by the console (and nothing
 * else be framed by anything).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  const preview = await lessonPreviewRepository.findLive(token, new Date());
  if (!preview) return <Expired />;

  const sections = splitMdxSections(preview.contentMdx);

  return (
    <div className="lesson-page">
      <p className="lesson-review-banner" role="status">
        <b>Aperçu.</b> La leçon telle que le site la rend, section après section ; rien n&apos;est
        enregistré, et les quiz se corrigent sur place.
      </p>
      <article className={LESSON_ARTICLE_CLASS}>
        {sections.map((src, i) => (
          // SAFETY: index key is stable - sections do not reorder after render
          <SectionPane key={i} index={i}>
            <LessonSection
              source={src}
              components={LESSON_MDX_COMPONENTS}
              options={LESSON_MDX_OPTIONS}
              lessonSlug="apercu"
              index={i}
            />
          </SectionPane>
        ))}
      </article>
      <PreviewScroll />
    </div>
  );
}

function Expired(): React.ReactElement {
  return (
    <div className="lesson-page">
      <p className="lesson-review-banner" role="status">
        <b>Aperçu expiré.</b> Un aperçu vit une demi-heure après sa dernière mise à jour.
        Rafraîchis-le depuis l&apos;éditeur.
      </p>
    </div>
  );
}
