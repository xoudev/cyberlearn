"use client";

import React from "react";
import { cn } from "@cyberlearn/ui";

export interface PillItem<K extends string> {
  key: K;
  label: string;
  /** A figure beside the label: how many things the filter keeps. */
  count?: number;
  /** The colour of the thing filtered (a category, a rarity); grey without one. */
  color?: string;
}

export interface PillsProps<K extends string> {
  items: readonly PillItem<K>[];
  /** The pill pressed right now. */
  value: K;
  onChange: (key: K) => void;
  /** What the row filters on, for the screen reader. */
  label: string;
  className?: string;
}

/**
 * A row of filter pills, one pressed: a domain, a rarity, a type.
 *
 * The catalogue of paths, the challenges and the badges each drew their own,
 * in a stylesheet or inline, with the same diamond dot and the same glow in
 * three sets of values. This is the one row; each pill lights up in the colour
 * of what it filters.
 */
export function Pills<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: PillsProps<K>): React.JSX.Element {
  return (
    <div role="group" aria-label={label} className={cn("pills", className)}>
      {items.map((item) => {
        const active = item.key === value;
        // A custom property is a valid inline style that CSSProperties does not list.
        const style: (React.CSSProperties & { "--pill-color": string }) | undefined =
          item.color !== undefined ? { "--pill-color": item.color } : undefined;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            data-active={active}
            className="pill"
            style={style}
            onClick={() => {
              onChange(item.key);
            }}
          >
            {item.color !== undefined && <i className="pill__dot" aria-hidden="true" />}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <>
                {" "}
                <b className="pill__count">{item.count}</b>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
