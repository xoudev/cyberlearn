import React from "react";

/**
 * A number with its name: the profile's cells, the public profile's strip,
 * the recap's and the locker's little boxes. Six drawings of the same thing
 * became one, in three sizes; the figure itself can be anything (a gradient
 * numeral, a value with a unit), so it is the children when `value` is not
 * enough.
 */
export function StatTile({
  label,
  value,
  sub,
  idx,
  size = "md",
  color,
  align = "left",
  className,
  style,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  /** A line under the figure, in the quietest grey. */
  sub?: React.ReactNode;
  /** "01": the profile numbers its cells. */
  idx?: string;
  size?: "sm" | "md" | "lg";
  /** The figure's colour; the primary text by default. */
  color?: string;
  align?: "left" | "center";
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}): React.ReactElement {
  const classes = [
    "stat-tile",
    `stat-tile--${size}`,
    align === "center" ? "stat-tile--center" : "",
    className ?? "",
  ]
    .filter((c) => c !== "")
    .join(" ");
  const labelEl = (
    <div className="stat-tile__label">
      {idx !== undefined && <span className="stat-tile__idx">{idx} ·</span>}
      {label}
    </div>
  );
  return (
    <div className={classes} style={style}>
      {size !== "md" && labelEl}
      {children ?? (
        <div className="stat-tile__value" style={color === undefined ? undefined : { color }}>
          {value}
        </div>
      )}
      {size === "md" && labelEl}
      {sub !== undefined && <div className="stat-tile__sub">{sub}</div>}
    </div>
  );
}
