/**
 * The settings, section by section: what the page's side nav lists and what
 * the drawer opens. One list, so a section added here is in both.
 */
export interface SettingsSection {
  /** The last segment of the address: /settings/<key>. */
  key: string;
  label: string;
  danger?: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { key: "profile", label: "Profil" },
  { key: "privacy", label: "Confidentialité" },
  { key: "preferences", label: "Préférences" },
  { key: "notifications", label: "Notifications" },
  { key: "moderation", label: "Modération" },
  { key: "account", label: "Compte" },
  { key: "data", label: "Données", danger: true },
];

export function settingsHref(key: string): string {
  return `/settings/${key}`;
}

export function settingsSection(key: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.key === key);
}
