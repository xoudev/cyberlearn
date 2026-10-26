/**
 * What the history and its loading state share: the prompt, the title and
 * the line under it. Written once, so the skeleton cannot drift from the page.
 */
export const NOTIFICATIONS_HEAD = {
  crumb: "notifications",
  title: "Notifications",
  lede: "Tout ce que la plateforme t'a signalé, du plus récent au plus ancien. Le panneau de la barre du haut n'en montre que les vingt dernières.",
} as const;
