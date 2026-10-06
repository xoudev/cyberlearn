/**
 * The settings, section by section: what the page's side nav lists and what
 * the drawer opens. One list, so a section added here is in both.
 */
export const SETTINGS_SECTION_KEYS = [
  "profile",
  "privacy",
  "preferences",
  "notifications",
  "moderation",
  "account",
  "data",
] as const;

/** The last segment of the address: /settings/<key>. */
export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];

export interface SettingsSection {
  key: SettingsSectionKey;
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

export function settingsHref(key: SettingsSectionKey): string {
  return `/settings/${key}`;
}

export function isSettingsSectionKey(key: string): key is SettingsSectionKey {
  return SETTINGS_SECTION_KEYS.some((known) => known === key);
}

export function settingsSection(key: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.key === key);
}

/** /settings/<key>, /settings (the first section), with or without a trailing slash. */
const SETTINGS_PATH = /^\/settings(?:\/([a-z]+))?\/?$/;

/**
 * The section an address points at, when it is one of the settings on this
 * site: what the drawer opens instead of following the link. Anything else
 * (another site, another page, an unknown section) is null and is followed.
 */
export function settingsSectionFromHref(href: string, origin: string): SettingsSectionKey | null {
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const match = SETTINGS_PATH.exec(url.pathname);
  if (!match) return null;
  const key = match[1] ?? "profile";
  return isSettingsSectionKey(key) ? key : null;
}

/** The full settings pages, where a link to a section is a link to a page. */
export function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}
