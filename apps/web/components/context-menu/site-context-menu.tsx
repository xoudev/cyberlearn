"use client";

// Client boundary: it listens to the page's right clicks and draws a menu.

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ADD_TO_NOTES_TARGET_ATTR,
  requestAddToNotes,
  requestSearch,
  SEARCH_TARGET_ATTR,
} from "@/lib/site-events";
import { ContextMenu, menuPoint, useContextMenu, type MenuEntry } from "./context-menu";

/** What was under the pointer when the menu was asked for. */
export interface SiteMenuContext {
  link: { href: string; sameOrigin: boolean } | null;
  image: { src: string } | null;
  /** The text selected at that moment, trimmed. */
  selection: string;
  /** The selection sits in a lesson whose toolbar can take it ("Ajouter à mes notes"). */
  canAddToNotes: boolean;
  /** The navbar's search is on the page. */
  canSearch: boolean;
}

export interface SiteMenuActions {
  navigate: (href: string) => void;
  openInNewTab: (href: string) => void;
  copy: (text: string, done: string) => void;
  search: (term: string) => void;
  addToNotes: (text: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
  pageUrl: () => string;
}

/** A selection shown in a label, cut short. */
function shortQuote(text: string): string {
  const one = text.replace(/\s+/g, " ");
  return one.length > 28 ? `${one.slice(0, 27).trimEnd()}…` : one;
}

/**
 * The entries for what is under the pointer: the link, the image, the
 * selection first, then the page's own moves. Pure, so the choice of entries
 * is tested apart from the DOM.
 */
export function siteMenuEntries(ctx: SiteMenuContext, act: SiteMenuActions): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const group = (items: MenuEntry[]): void => {
    if (items.length === 0) return;
    if (entries.length > 0)
      entries.push({ kind: "separator", id: `sep-${String(entries.length)}` });
    entries.push(...items);
  };

  const link = ctx.link;
  if (link) {
    group([
      {
        kind: "item",
        id: "link-open",
        label: "Ouvrir le lien",
        onSelect: () => {
          act.navigate(link.href);
        },
      },
      {
        kind: "item",
        id: "link-tab",
        label: "Ouvrir dans un nouvel onglet",
        onSelect: () => {
          act.openInNewTab(link.href);
        },
      },
      {
        kind: "item",
        id: "link-copy",
        label: "Copier l'adresse du lien",
        onSelect: () => {
          act.copy(link.href, "Adresse du lien copiée.");
        },
      },
    ]);
  }

  const image = ctx.image;
  if (image) {
    group([
      {
        kind: "item",
        id: "image-tab",
        label: "Ouvrir l'image dans un nouvel onglet",
        onSelect: () => {
          act.openInNewTab(image.src);
        },
      },
      {
        kind: "item",
        id: "image-copy",
        label: "Copier l'adresse de l'image",
        onSelect: () => {
          act.copy(image.src, "Adresse de l'image copiée.");
        },
      },
    ]);
  }

  const selection = ctx.selection;
  if (selection) {
    const items: MenuEntry[] = [
      {
        kind: "item",
        id: "sel-copy",
        label: "Copier",
        onSelect: () => {
          act.copy(selection, "Texte copié.");
        },
      },
    ];
    if (ctx.canAddToNotes) {
      items.push({
        kind: "item",
        id: "sel-note",
        label: "Ajouter à mes notes",
        onSelect: () => {
          act.addToNotes(selection);
        },
      });
    }
    if (ctx.canSearch) {
      items.push({
        kind: "item",
        id: "sel-search",
        label: `Rechercher « ${shortQuote(selection)} »`,
        onSelect: () => {
          act.search(selection.slice(0, 100));
        },
      });
    }
    group(items);
  }

  group([
    { kind: "item", id: "back", label: "Retour", onSelect: act.back },
    { kind: "item", id: "forward", label: "Suivant", onSelect: act.forward },
    { kind: "item", id: "reload", label: "Recharger la page", onSelect: act.reload },
  ]);
  const page: MenuEntry[] = [
    {
      kind: "item",
      id: "page-copy",
      label: "Copier l'adresse de la page",
      onSelect: () => {
        act.copy(act.pageUrl(), "Adresse de la page copiée.");
      },
    },
  ];
  if (ctx.canSearch && !selection) {
    page.push({
      kind: "item",
      id: "search",
      label: "Rechercher sur CyberLearn",
      onSelect: () => {
        act.search("");
      },
    });
  }
  group(page);
  entries.push({ kind: "separator", id: "sep-hint" });
  entries.push({ kind: "label", id: "hint", label: "Maj + clic droit : menu du navigateur" });
  return entries;
}

/**
 * Where the browser keeps its own menu: with Shift held, in what one types
 * into (paste, spelling), on a touch screen's long press, and on an element
 * that asks for it (data-native-contextmenu).
 */
export function keepsBrowserMenu(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.shiftKey) return true;
  if (
    event instanceof PointerEvent &&
    (event.pointerType === "touch" || event.pointerType === "pen")
  ) {
    return true;
  }
  const target = event.target;
  if (!(target instanceof Element)) return true;
  return (
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], .cm-editor, [data-native-contextmenu]',
    ) !== null
  );
}

/** What is under the pointer, read from the DOM. */
export function readMenuContext(target: Element): SiteMenuContext {
  const anchor = target.closest("a[href]");
  const href = anchor instanceof HTMLAnchorElement ? anchor.href : null;
  const img = target.closest("img");
  const src = img instanceof HTMLImageElement ? img.currentSrc || img.src : null;
  const sel = window.getSelection();
  const selection = sel && !sel.isCollapsed ? sel.toString().trim() : "";
  const anchorNode = sel && !sel.isCollapsed ? sel.anchorNode : null;
  const anchorEl = anchorNode instanceof Element ? anchorNode : (anchorNode?.parentElement ?? null);
  const inLesson = anchorEl?.closest(".lesson-content") !== null && anchorEl !== null;
  return {
    link:
      href && /^(https?:|mailto:)/i.test(href)
        ? { href, sameOrigin: href.startsWith(window.location.origin) }
        : null,
    image: src && /^https?:/i.test(src) ? { src } : null,
    selection: selection.slice(0, 5_000),
    canAddToNotes: inLesson && document.querySelector(`[${ADD_TO_NOTES_TARGET_ATTR}]`) !== null,
    canSearch: document.querySelector(`[${SEARCH_TARGET_ATTR}]`) !== null,
  };
}

/**
 * The right-click menu of the whole site, mounted once in the root layout. A
 * surface with menus of its own calls preventDefault on the event, and this
 * one stays shut.
 */
export function SiteContextMenu(): React.JSX.Element | null {
  const router = useRouter();
  const { menu, open, close } = useContextMenu();

  useEffect(() => {
    const onContextMenu = (event: MouseEvent): void => {
      if (keepsBrowserMenu(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      event.preventDefault();
      const ctx = readMenuContext(target);
      const actions: SiteMenuActions = {
        navigate: (href) => {
          if (href.startsWith(window.location.origin))
            router.push(href.slice(window.location.origin.length) || "/");
          else window.location.assign(href);
        },
        openInNewTab: (href) => {
          window.open(href, "_blank", "noopener,noreferrer");
        },
        copy: (text, done) => {
          void navigator.clipboard
            .writeText(text)
            .then(() => toast.success(done))
            .catch(() => toast.error("Copie impossible : le navigateur l'a refusée."));
        },
        search: requestSearch,
        addToNotes: requestAddToNotes,
        back: () => {
          router.back();
        },
        forward: () => {
          router.forward();
        },
        reload: () => {
          window.location.reload();
        },
        pageUrl: () => window.location.href,
      };
      const anchor = target instanceof HTMLElement ? target : null;
      const point = menuPoint(event, target);
      open({
        x: point.x,
        y: point.y,
        label: "Menu de la page",
        entries: siteMenuEntries(ctx, actions),
        returnFocus: anchor?.closest<HTMLElement>("a, button, [tabindex]") ?? null,
      });
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [open, router]);

  return menu ? <ContextMenu menu={menu} onClose={close} /> : null;
}
