/**
 * Whether finishing a path earns a certificate: the catalogue's paths only.
 *
 * A certificate carries the platform's name and is verifiable at a public
 * address; a path a teacher assembled for one class is teaching material, not
 * a credential the platform vouches for. The server refuses one
 * (claimCertificate and the emission on the last lesson read CATALOGUE_PATH),
 * so neither app may promise it: the site's path page drops its certificate
 * and its final node, and the app's final card, fed by /api/mobile/exam,
 * shows nothing. Finishing a class path still earns every lesson's XP.
 *
 * Pure and dependency-free, so the site and the app's route read one rule.
 */
export function isCertifiablePath(path: { audience: "CATALOGUE" | "CLASS" }): boolean {
  return path.audience === "CATALOGUE";
}
