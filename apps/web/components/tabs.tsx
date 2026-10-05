"use client";

import React from "react";
import { cn } from "@cyberlearn/ui";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  /** A figure beside the label: how many things the tab holds, or "3/8" of them. */
  count?: number | string;
}

export interface TabsProps<K extends string> {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** What the set of tabs is, for the screen reader. */
  label: string;
  /** Pushed to the far end of the row: a sort, a view, a note. */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * One view at a time: the row of tabs, the current one underlined.
 *
 * Four pages drew their own (the profile, the casier, the leaderboard, a
 * class), one with a tablist, three with styled buttons. This is the one row,
 * with the roles a tab set has, and the count chip the profile and the class
 * each drew for themselves.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  trailing,
  className,
}: TabsProps<K>): React.JSX.Element {
  return (
    <div role="tablist" aria-label={label} className={cn("tabs", className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className="tabs__tab"
            onClick={() => {
              onChange(item.key);
            }}
          >
            {item.label}
            {item.count !== undefined && (
              <>
                {" "}
                <b className="tabs__count">{item.count}</b>
              </>
            )}
          </button>
        );
      })}
      {trailing !== undefined && <div className="tabs__trailing">{trailing}</div>}
    </div>
  );
}
