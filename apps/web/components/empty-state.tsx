import React from "react";

/**
 * Nothing to list, said once: a dashed box, a title, a line, and whatever
 * can be done about it. Three pages had a component of their own for it and
 * five more a class, none alike.
 */
export function EmptyState({
  title,
  message,
  glyph,
  children,
  style,
}: {
  title?: string;
  message?: React.ReactNode;
  glyph?: React.ReactNode;
  /** What can be done about it: a link, a button. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <div className="empty-state" style={style}>
      {glyph !== undefined && (
        <div className="empty-state__glyph" aria-hidden="true">
          {glyph}
        </div>
      )}
      {title !== undefined && <p className="empty-state__title">{title}</p>}
      {message !== undefined && <p className="empty-state__message">{message}</p>}
      {children !== undefined && <div className="empty-state__action">{children}</div>}
    </div>
  );
}
