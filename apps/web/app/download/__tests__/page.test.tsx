import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { availabilityLine, installIntro } from "../availability";

/**
 * What /download says about where the app can be had. It said it twice, and
 * not the same thing: a hero offering to install the Android app above a line
 * saying it was still being published, with a version number the Play Store
 * had moved past.
 */

const links = vi.hoisted(() => {
  const env: {
    NEXT_PUBLIC_ANDROID_PLAY_URL: string | undefined;
    NEXT_PUBLIC_ANDROID_APK_URL: string | undefined;
    NEXT_PUBLIC_IOS_APP_STORE_URL: string | undefined;
  } = {
    NEXT_PUBLIC_ANDROID_PLAY_URL: undefined,
    NEXT_PUBLIC_ANDROID_APK_URL: undefined,
    NEXT_PUBLIC_IOS_APP_STORE_URL: undefined,
  };
  return { env };
});
vi.mock("@/lib/env", () => links);

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));

const { default: DownloadPage } = await import("../page");

const PLAY = "https://play.google.com/store/apps/details?id=fr.cyberlearn.app";
const APP_STORE = "https://apps.apple.com/fr/app/cyberlearn/id1";

function render(): string {
  // Text only: the apostrophes are typographic, and markup would escape them.
  return renderToStaticMarkup(<DownloadPage />)
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'");
}

beforeEach(() => {
  links.env.NEXT_PUBLIC_ANDROID_PLAY_URL = undefined;
  links.env.NEXT_PUBLIC_ANDROID_APK_URL = undefined;
  links.env.NEXT_PUBLIC_IOS_APP_STORE_URL = undefined;
});

describe("the availability line", () => {
  it("says what is out on each platform", () => {
    expect(availabilityLine({ android: false, iosAppStore: false })).toBe(
      "Publication Android en cours · Web app disponible sur iPhone",
    );
    expect(availabilityLine({ android: true, iosAppStore: false })).toBe(
      "Application Android disponible · Web app disponible sur iPhone",
    );
    expect(availabilityLine({ android: false, iosAppStore: true })).toBe(
      "Publication Android en cours · Application iPhone disponible",
    );
    expect(availabilityLine({ android: true, iosAppStore: true })).toBe(
      "Application Android disponible · Application iPhone disponible",
    );
  });
});

describe("the installation intro", () => {
  // It read the App Store link alone, and called Android native whatever its
  // own link said.
  it("speaks of a native app only on a platform whose link is set", () => {
    expect(installIntro({ android: true, iosAppStore: true })).toBe(
      "Android et iPhone disposent chacun de leur application native.",
    );
    expect(installIntro({ android: false, iosAppStore: true })).toBe(
      "L’application native est disponible sur iPhone. Celle d’Android est en cours de publication.",
    );
    expect(installIntro({ android: true, iosAppStore: false })).toBe(
      "Android dispose de son application native. Sur iPhone, CyberLearn s’installe depuis Safari.",
    );
    expect(installIntro({ android: false, iosAppStore: false })).toBe(
      "L’application Android est en cours de publication. Sur iPhone, CyberLearn s’installe depuis Safari.",
    );
  });
});

describe("the download page", () => {
  it("no longer calls the Android app unpublished once its Play Store link is set", () => {
    links.env.NEXT_PUBLIC_ANDROID_PLAY_URL = PLAY;
    const text = render();

    expect(text).toContain("Installer l’application");
    expect(text).toContain("Application Android disponible");
    expect(text).not.toContain("Publication Android en cours");
  });

  it("an APK link counts as published too", () => {
    links.env.NEXT_PUBLIC_ANDROID_APK_URL = "https://cyberlearn.fr/cyberlearn.apk";

    expect(render()).toContain("Application Android disponible");
  });

  it("still says Android is on its way while no link is set", () => {
    const text = render();

    expect(text).toContain("Être prévenu du lancement");
    expect(text).toContain("Publication Android en cours · Web app disponible sur iPhone");
  });

  it("speaks of the native iPhone app, not the web app, once the App Store link is set", () => {
    links.env.NEXT_PUBLIC_IOS_APP_STORE_URL = APP_STORE;
    const text = render();

    expect(text).toContain("Application iPhone disponible");
    expect(text).not.toContain("Web app installable");
    expect(text).not.toContain("s’installe depuis Safari");
  });

  it("never calls Android native while only the App Store link is set", () => {
    links.env.NEXT_PUBLIC_IOS_APP_STORE_URL = APP_STORE;
    const text = render();

    expect(text).toContain("Publication Android en cours");
    expect(text).toContain("Celle d’Android est en cours de publication.");
    expect(text).not.toContain("Android et iPhone disposent");
    expect(text).not.toContain("Android dispose de son application native");
    // The stats strip: « Android » then its value, tags turned to spaces.
    expect(text).toMatch(/Android\s+Publication en cours/u);
    expect(text).not.toMatch(/Android\s+Application native/u);
  });

  it("calls Android native in the stats strip once it is published", () => {
    links.env.NEXT_PUBLIC_ANDROID_PLAY_URL = PLAY;

    expect(render()).toMatch(/Android\s+Application native/u);
  });

  it("names no version, which only the store knows", () => {
    links.env.NEXT_PUBLIC_ANDROID_PLAY_URL = PLAY;

    expect(render()).not.toMatch(/\bv\d+\.\d+/u);
  });
});
