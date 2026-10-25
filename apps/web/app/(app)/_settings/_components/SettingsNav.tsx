"use client";

// The drawer keeps its loaded sections and changes the active one in place.
import React, { useLayoutEffect, useRef } from "react";
import { SETTINGS_SECTIONS, type SettingsSectionKey } from "./sections";

export function SettingsNav({
  current,
  onSelect,
}: {
  current: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
}): React.JSX.Element {
  const navigation = useRef<HTMLElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const reveal = (): void => {
      const scroller = navigation.current?.parentElement;
      const button = selected.current;
      if (!scroller || !button || scroller.scrollWidth <= scroller.clientWidth) return;
      const bounds = scroller.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      if (target.left < bounds.left) scroller.scrollLeft += target.left - bounds.left - 12;
      else if (target.right > bounds.right) scroller.scrollLeft += target.right - bounds.right + 12;
    };
    reveal();
    window.addEventListener("resize", reveal);
    return () => {
      window.removeEventListener("resize", reveal);
    };
  }, [current]);
  return (
    <nav ref={navigation} className="settings-nav" aria-label="Sections des paramètres">
      <p className="settings-nav__label">Ton compte</p>
      {SETTINGS_SECTIONS.map((section, index) => (
        <button
          key={section.key}
          ref={current === section.key ? selected : undefined}
          type="button"
          aria-current={current === section.key ? "true" : undefined}
          data-danger={section.danger ?? undefined}
          onClick={() => {
            onSelect(section.key);
          }}
        >
          <span className="settings-nav__number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {section.label}
        </button>
      ))}
    </nav>
  );
}
