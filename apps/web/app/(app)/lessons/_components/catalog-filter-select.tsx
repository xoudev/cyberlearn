"use client";

// Client: a dropdown opens, follows the arrow keys and navigates on a choice,
// none of which a link can do. The page builds every option's URL; this only
// goes there.

import React, { useId, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@cyberlearn/ui";

/**
 * The option that means "no filter". Not exported: a server component that
 * imports a value from a client module gets a reference to it, not the string.
 */
const ALL = "ALL";

export interface CatalogFilterOption {
  value: string;
  label: string;
  /** The catalogue's URL with this option chosen. */
  href: string;
}

interface CatalogFilterSelectProps {
  /** The words before the control: "Niveau". */
  label: string;
  /** The chosen option, or "ALL" for none. */
  value: string;
  options: readonly CatalogFilterOption[];
}

export function CatalogFilterSelect({
  label,
  value,
  options,
}: CatalogFilterSelectProps): React.ReactElement {
  const router = useRouter();
  const labelId = useId();
  const [, startTransition] = useTransition();
  // The choice shows at once; the server's answer replaces it when it lands.
  const [shown, setShown] = useOptimistic(value);
  // Marked when it narrows the list, like the category pill that does. It
  // used to be the other way round: lit while it filtered nothing.
  const active = shown !== ALL;

  return (
    <div className="catalogue-select" data-filtered={active}>
      {/* The control's name: the glyph is decoration, kept out of it. */}
      <span id={labelId} className="catalogue-select__label">
        {label}
      </span>
      <Select
        aria-labelledby={labelId}
        block={false}
        options={options}
        value={shown}
        onChange={(next) => {
          const option = options.find((o) => o.value === next);
          if (option === undefined || next === shown) return;
          startTransition(() => {
            setShown(next);
            router.replace(option.href, { scroll: false });
          });
        }}
        style={{ width: "100%", minWidth: 0 }}
        triggerStyle={{
          height: 46,
          padding: "0 12px",
          fontFamily: "var(--font-interface), sans-serif",
          fontSize: 13,
          fontWeight: 400,
          letterSpacing: 0,
          textTransform: "none",
          background: "#0d0e12",
          border: "1px solid #4e4e52",
          color: "#c2bfb8",
          ...(active
            ? {
                border: "1px solid #ff6b2b",
                color: "#ff864f",
              }
            : {}),
        }}
      />
    </div>
  );
}
