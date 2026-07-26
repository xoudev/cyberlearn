import React from "react";
import type { CSSProperties } from "react";
import { AppScreen, type ScreenName } from "./screens";
import { palette } from "../theme";

export function PhoneMock({
  screen,
  style,
}: {
  screen: ScreenName;
  style?: CSSProperties;
}): React.JSX.Element {
  return (
    <div
      style={{
        width: 430,
        height: 932,
        padding: 10,
        borderRadius: 52,
        backgroundColor: palette.borderDefault,
        boxShadow: `0 38px 90px ${palette.blueSoft}`,
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 42,
          border: `1px solid ${palette.borderSubtle}`,
          backgroundColor: palette.bgBase,
        }}
      >
        <AppScreen screen={screen} />
      </div>
    </div>
  );
}
