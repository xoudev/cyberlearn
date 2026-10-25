"use client";

// "use client" justification: the drawer is state in the browser. It opens
// over the page without a navigation, holds the sections it has loaded, and
// listens for clicks on links to the settings anywhere in the signed-in site.

import React, {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { SideDrawer } from "@cyberlearn/ui";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import { settingsDataSchema, type SettingsData } from "../_lib/settings-data";
import { SettingsNav } from "./SettingsNav";
import { SettingsSkeleton } from "./SettingsSkeleton";
import { SettingsReloadContext } from "./settings-reload";
import "./settings-bastion.css";
import { isSettingsSectionKey, settingsSectionFromHref, type SettingsSectionKey } from "./sections";

/**
 * The settings as a drawer over the page, opened from the navbar's gear or
 * from any link to /settings/<section> inside the signed-in site.
 *
 * It used to be a route intercepted into a slot: opening it was a navigation,
 * and so was every section picked in it, each one a round trip to the server
 * before anything moved. Now nothing navigates. The drawer opens at once, its
 * seven sections arrive in one request (/api/me/settings), started as soon as
 * the pointer reaches a link to it, and picking a section is a change of
 * state. The address stays the page's.
 *
 * There are no settings pages. An address from outside the site (an e-mail,
 * a bookmark, a notification) is redirected to /dashboard?settings=<section>
 * by next.config, and the drawer opens there (SettingsFromAddress, drawn by
 * the layout's QueryDialogHost).
 */

export interface SettingsDrawerControls {
  /** Opens the drawer on a section. */
  open: (section: SettingsSectionKey) => void;
  /**
   * Opens the drawer if the address is one of the settings; says whether it
   * did. Anything else is the caller's to follow.
   */
  openHref: (href: string) => boolean;
  /** Starts loading the data and the forms before the drawer is asked for. */
  prefetch: () => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerControls | null>(null);

/** The drawer's controls, or null outside the signed-in site. */
export function useSettingsDrawer(): SettingsDrawerControls | null {
  return useContext(SettingsDrawerContext);
}

const SettingsPanels = lazy(() => import("./SettingsPanels"));

/** Data prefetched on a hover is used by a click within this delay. */
const PREFETCH_FRESH_MS = 30_000;

interface SettingsRequest {
  at: number;
  promise: Promise<SettingsData | null>;
  /** Set once the request has settled: null when it failed. */
  settled?: { value: SettingsData | null };
}

async function fetchSettings(): Promise<SettingsData | null> {
  try {
    const response = await fetch("/api/me/settings", { cache: "no-store" });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const parsed = settingsDataSchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function startRequest(): SettingsRequest {
  const request: SettingsRequest = { at: Date.now(), promise: fetchSettings() };
  void request.promise.then((value) => {
    request.settled = { value };
  });
  // The forms' code, fetched alongside the data.
  void import("./SettingsPanels");
  return request;
}

interface OpenState {
  section: SettingsSectionKey;
  /** The page it opened over: a navigation away closes it. */
  pathname: string;
}

export function SettingsDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [opened, setOpened] = useState<OpenState | null>(null);
  const [data, setData] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);

  // A navigation closes it for good: coming back to the page with the
  // browser's back button does not bring it back. The commit that brings the
  // new page draws it closed, without giving the focus back to its opener:
  // the navbar's gear is still there, but the new page is read from its
  // start, skip link first. Then it goes, before anything is painted.
  const navigatedAway = opened !== null && opened.pathname !== pathname;
  useLayoutEffect(() => {
    if (navigatedAway) setOpened(null);
  }, [navigatedAway]);
  const isOpen = useRef(false);
  useEffect(() => {
    isOpen.current = opened !== null;
  }, [opened]);

  /** A hover's request, waiting for the click it anticipates. */
  const prefetched = useRef<SettingsRequest | null>(null);
  /** The request the open drawer listens to; an older one's answer is dropped. */
  const active = useRef<SettingsRequest | null>(null);

  const listen = useCallback((request: SettingsRequest, onFailure: () => void): void => {
    active.current = request;
    void request.promise.then((value) => {
      if (active.current !== request) return;
      if (value === null) onFailure();
      else setData(value);
    });
  }, []);

  const prefetch = useCallback((): void => {
    const current = prefetched.current;
    if (current && Date.now() - current.at < PREFETCH_FRESH_MS) return;
    prefetched.current = startRequest();
  }, []);

  const open = useCallback(
    (section: SettingsSectionKey): void => {
      // Already open (a link to another section, drawn inside one): a switch.
      if (isOpen.current) {
        setOpened((current) => (current ? { ...current, section } : current));
        return;
      }
      isOpen.current = true;

      // A hover's request is used once, by the opening it anticipated: a
      // later opening asks again, so a form never starts from stale values.
      const ahead = prefetched.current;
      prefetched.current = null;
      const request = ahead && Date.now() - ahead.at < PREFETCH_FRESH_MS ? ahead : startRequest();

      setFailed(false);
      setData(request.settled?.value ?? null);
      setOpened({ section, pathname: pathnameRef.current });
      listen(request, () => {
        setFailed(true);
      });
    },
    [listen],
  );

  const openHref = useCallback(
    (href: string): boolean => {
      const section = settingsSectionFromHref(href, window.location.origin);
      if (section === null) return false;
      open(section);
      return true;
    },
    [open],
  );

  // SideDrawer gives the focus back to what opened it: Escape, the backdrop
  // and the close button all end here.
  const close = useCallback((): void => {
    isOpen.current = false;
    active.current = null;
    setOpened(null);
    setData(null);
  }, []);

  /** After a change only the server can reflect: the same sections, asked again. */
  const reload = useCallback((): void => {
    listen(startRequest(), () => undefined);
  }, [listen]);

  const retry = useCallback((): void => {
    setFailed(false);
    listen(startRequest(), () => {
      setFailed(true);
    });
  }, [listen]);

  const select = useCallback((section: SettingsSectionKey): void => {
    setOpened((current) => (current ? { ...current, section } : current));
  }, []);

  // Every link to the settings, wherever it is drawn: a click opens the
  // drawer instead (the link's own handlers still run, Next's Link sees the
  // default prevented and stays put), a hover or a focus starts the loading.
  // A modified click or a new tab keep the browser's way (and land on the
  // redirect, which opens the drawer over the dashboard).
  useEffect(() => {
    const sectionOf = (target: EventTarget | null): SettingsSectionKey | null => {
      if (!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return null;
      if (anchor.hasAttribute("download")) return null;
      if (anchor.target !== "" && anchor.target !== "_self") return null;
      return settingsSectionFromHref(anchor.href, window.location.origin);
    };
    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const section = sectionOf(event.target);
      if (section === null) return;
      event.preventDefault();
      open(section);
    };
    const onIntent = (event: Event): void => {
      if (sectionOf(event.target) !== null) prefetch();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
    };
  }, [open, prefetch]);

  const controls = useMemo<SettingsDrawerControls>(
    () => ({ open, openHref, prefetch }),
    [open, openHref, prefetch],
  );

  return (
    <SettingsDrawerContext value={controls}>
      {children}
      {opened && (
        <SettingsReloadContext value={reload}>
          <SettingsDrawerFrame
            open={!navigatedAway}
            section={opened.section}
            username={data?.profile.username ?? null}
            onSelect={select}
            onClose={close}
          >
            {data !== null ? (
              <Suspense fallback={<SettingsSkeleton section={opened.section} />}>
                <SettingsPanels data={data} section={opened.section} />
              </Suspense>
            ) : failed ? (
              <SettingsLoadError onRetry={retry} />
            ) : (
              <SettingsSkeleton section={opened.section} />
            )}
          </SettingsDrawerFrame>
        </SettingsReloadContext>
      )}
    </SettingsDrawerContext>
  );
}

/**
 * Opens the drawer when the address asks for it (?settings=<section>, where
 * the redirect of /settings/<section> lands). It is the settings' entry among
 * the windows the address opens (components/query-dialogs.ts), with a
 * difference: the drawer keeps its own state, not the address's. The request
 * is handed over and the parameter taken off at once: a reload or a copied
 * link must not open it again, and closing it must not leave the parameter
 * behind.
 */
export function SettingsFromAddress({ value, onClose }: QueryDialogProps): null {
  const drawer = useSettingsDrawer();
  useEffect(() => {
    onClose();
    if (drawer !== null && isSettingsSectionKey(value)) drawer.open(value);
  }, [value, onClose, drawer]);
  return null;
}

function SettingsDrawerFrame({
  open,
  section,
  username,
  onSelect,
  onClose,
  children,
}: {
  /** False once a navigation has closed it: it then hands the focus to no one. */
  open: boolean;
  section: SettingsSectionKey;
  username: string | null;
  onSelect: (section: SettingsSectionKey) => void;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const content = useRef<HTMLDivElement>(null);

  return (
    <SideDrawer
      open={open}
      returnFocus={open}
      onClose={onClose}
      title="Paramètres"
      className="settings-bastion"
      width={960}
      meta={username !== null && username !== "" ? `@${username}` : undefined}
      closeLabel="Fermer les paramètres"
    >
      <div className="settings-drawer-body">
        <div className="settings-drawer-nav">
          <SettingsNav
            current={section}
            onSelect={(next) => {
              if (content.current) content.current.scrollTop = 0;
              onSelect(next);
            }}
          />
        </div>
        <div ref={content} className="settings-drawer-content">
          {children}
        </div>
      </div>
    </SideDrawer>
  );
}

function SettingsLoadError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className="card card--sunken" role="alert" style={{ padding: "22px 20px" }}>
      <p className="mono-label" style={{ color: "var(--color-text-muted)", margin: "0 0 10px" }}>
        {"// Paramètres indisponibles"}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--color-text-secondary)" }}>
        Les paramètres n&apos;ont pas pu être chargés. Vérifie ta connexion, puis réessaie.
      </p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
