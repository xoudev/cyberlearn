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
