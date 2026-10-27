"use client";

// Client: the debounced search updates URL filters and follows browser navigation.

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSlashFocus } from "@/hooks/use-slash-focus";
import {
  CATALOG_SEARCH_MAX,
  catalogHref,
  parseCatalogFilters,
  type RawParams,
} from "@/lib/lessons/catalog-filters";

export function LessonsSearchBar(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Cut where the list cuts it, so a longer term from the navbar shows as the
  // part of it that filters.
  const urlQuery = (searchParams.get("q") ?? "").slice(0, CATALOG_SEARCH_MAX);
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The last search this box put in the URL. The URL catching up with it is
  // an echo; any other change came from elsewhere.
  const sentRef = useRef(urlQuery);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useSlashFocus(inputRef);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  // The box shows the URL's search. Uncontrolled, it kept its text after
  // "Réinitialiser les filtres" or a step back, over a list it no longer
  // filtered. An echo of its own search is left alone: the reader may have
  // typed on while it travelled.
  useEffect(() => {
    if (urlQuery === sentRef.current) return;
    clearTimeout(debounceRef.current);
    sentRef.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Read when it fires, not when typed: a filter chosen in between is
      // in the URL now and has to stay there. Through the page's own parser
      // and builder, so only valid filters travel on and the page is the first.
      const current: RawParams = {};
      for (const [key, param] of new URLSearchParams(window.location.search)) {
        // The first of a repeated param, as the server reads it.
        current[key] ??= param;
      }
      sentRef.current = next;
      const href = catalogHref(parseCatalogFilters(current), { q: next.length > 0 ? next : null });
      startTransition(() => {
        router.replace(href);
      });
    }, 300);
  }

  return (
    <label className="catalogue-search">
      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth={1.5} />
        <path d="M11 11 L14 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        maxLength={CATALOG_SEARCH_MAX}
        placeholder="Rechercher une leçon…"
        aria-label="Rechercher une leçon"
        aria-keyshortcuts="/"
      />
    </label>
  );
}
