import React from "react";
import { AbsoluteFill, Composition, Img, Still, staticFile } from "remotion";
import { FeatureGraphic } from "./compositions/feature-graphic";
import { LinkedInVideo } from "./compositions/linkedin-video";
import { PromoVideo } from "./compositions/promo-video";
import { StoreScreenshot } from "./compositions/store-screenshot";
import { YouTubeBanner, YouTubeThumbnail } from "./compositions/youtube-assets";

function StoreIcon(): React.JSX.Element {
  return (
    <AbsoluteFill>
      <Img src={staticFile("icon.png")} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
}

export function MarketingRoot(): React.JSX.Element {
  return (
    <>
      <Still id="StoreIcon" component={StoreIcon} width={512} height={512} />
      <Still id="FeatureGraphic" component={FeatureGraphic} width={1024} height={500} />
      <Still id="YouTubeBanner" component={YouTubeBanner} width={2560} height={1440} />
      <Still id="YouTubeThumbnail" component={YouTubeThumbnail} width={1280} height={720} />
      <Still
        id="StoreHome"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        defaultProps={{
          screen: "home",
          index: "01",
          title: "Progresse à chaque session.",
          body: "XP, séries et reprise instantanée.",
        }}
      />
      <Still
        id="StorePaths"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        defaultProps={{
          screen: "paths",
          index: "02",
          title: "Un parcours. Un vrai objectif.",
          body: "Développement, réseau et cybersécurité.",
        }}
      />
      <Still
        id="StoreLesson"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        defaultProps={{
          screen: "lesson",
          index: "03",
          title: "Lis. Teste. Comprends.",
          body: "Des leçons structurées, jusque dans le terminal.",
        }}
      />
      <Still
        id="StoreProfile"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        defaultProps={{
          screen: "profile",
          index: "04",
          title: "Ton niveau raconte ton travail.",
          body: "Badges, certificats et progression réunis.",
        }}
      />
      <Still
        id="StoreLocker"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        defaultProps={{
          screen: "locker",
          index: "05",
          title: "Construis ton identité.",
          body: "Débloque et équipe tes cosmétiques.",
        }}
      />
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={855}
      />
      <Composition
        id="LinkedInVideo"
        component={LinkedInVideo}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={645}
      />
    </>
  );
}
