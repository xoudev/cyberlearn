/** Which official links the deployment names (NEXT_PUBLIC_*_URL). */
export interface StoreAvailability {
  /** A Play Store or APK link is set. */
  android: boolean;
  /** An App Store link is set. */
  iosAppStore: boolean;
}

/**
 * The line under the hero's buttons, saying where the app can be had.
 *
 * It was written once, « Publication Android en cours · Web app disponible
 * sur iPhone », and stayed so once the Play Store link was set: the hero said
 * « Installer l'application » right above a line saying it was not out yet.
 * It is built from the same links as the buttons now.
 */
export function availabilityLine({ android, iosAppStore }: StoreAvailability): string {
  return [
    android ? "Application Android disponible" : "Publication Android en cours",
    iosAppStore ? "Application iPhone disponible" : "Web app disponible sur iPhone",
  ].join(" · ");
}

/**
 * The sentence that opens the installation section.
 *
 * It looked at the App Store link alone: with it set and Android not out yet,
 * it said both phones had their native app, a few lines below « Publication
 * Android en cours ». It reads both links now, like the line above.
 */
export function installIntro({ android, iosAppStore }: StoreAvailability): string {
  if (android && iosAppStore) {
    return "Android et iPhone disposent chacun de leur application native.";
  }
  if (iosAppStore) {
    return "L’application native est disponible sur iPhone. Celle d’Android est en cours de publication.";
  }
  if (android) {
    return "Android dispose de son application native. Sur iPhone, CyberLearn s’installe depuis Safari.";
  }
  return "L’application Android est en cours de publication. Sur iPhone, CyberLearn s’installe depuis Safari.";
}
