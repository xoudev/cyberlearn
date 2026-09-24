import React from "react";
import { Img, staticFile } from "remotion";
import { fonts, palette } from "../theme";

/**
 * A browser window around a capture of the real platform.
 *
 * The images in `public/screens` are screenshots of the product's own React
 * components, rendered with the product's own CSS. They are not drawings of
 * it. The first version of this file was, and that was the wrong call. A
 * video that recruits testers has to show what they will actually get, and a
 * drawing starts lying the moment somebody moves a button.
 *
 * They are produced by a throwaway harness route that mounts the real
 * components with sample data; the README has the procedure. Sample data
 * rather than a real class on purpose: a real roster on a public video
 * publishes real students' names, and most of them are minors.
 *
 * Regenerating them is the price of keeping them honest. When a screen changes
 * enough that this video misrepresents it, recapture: that is a smaller job
 * than noticing a drawing has drifted, which nobody ever does.
 */

export type ShotName = "paths" | "quiz" | "class";

/** Each capture's own pixel size, so nothing is stretched. */
const SHOT: Record<ShotName, { file: string; width: number; height: number }> = {
  paths: { file: "screens/screen-paths.png", width: 1440, height: 1000 },
  quiz: { file: "screens/screen-quiz.png", width: 1440, height: 538 },
  class: { file: "screens/screen-class.png", width: 1440, height: 597 },
};

const CHROME_HEIGHT = 38;

export function BrowserMock({
  screen,
  style,
}: {
  screen: ShotName;
  style?: React.CSSProperties;
}): React.JSX.Element {
  const shot = SHOT[screen];

  return (
    <div
      style={{
        width: shot.width,
        height: shot.height + CHROME_HEIGHT,
        border: `1px solid ${palette.borderDefault}`,
        backgroundColor: palette.bgBase,
        boxShadow: `0 40px 100px ${palette.blueSoft}`,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: CHROME_HEIGHT,
          padding: "0 14px",
          borderBottom: `1px solid ${palette.borderDefault}`,
          backgroundColor: palette.bgElevated,
        }}
      >
        {[palette.danger, palette.warning, palette.brandTurquoise].map((c) => (
          <div key={c} style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: c }} />
        ))}
        <div
          style={{
            marginLeft: 10,
            padding: "4px 14px",
            border: `1px solid ${palette.borderDefault}`,
            color: palette.textMuted,
            fontFamily: fonts.mono,
            fontSize: 11,
          }}
        >
          cyberlearn.fr
        </div>
      </div>

      <Img
        src={staticFile(shot.file)}
        style={{ display: "block", width: shot.width, height: shot.height }}
      />
    </div>
  );
}
