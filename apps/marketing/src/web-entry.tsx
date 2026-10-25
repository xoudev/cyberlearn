import React from "react";
import { Composition, registerRoot } from "remotion";
import { WebLaunchVideo, WebWelcomeVideo } from "./compositions/web-orientation";
import "./web-styles.css";

function WebVideoRoot(): React.ReactElement {
  return (
    <>
      <Composition
        id="WebLaunch"
        component={WebLaunchVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={900}
      />
      <Composition
        id="WebWelcome"
        component={WebWelcomeVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={630}
      />
    </>
  );
}

registerRoot(WebVideoRoot);
