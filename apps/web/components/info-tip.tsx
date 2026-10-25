"use client";

// The tooltip follows its trigger and handles its own Escape before an enclosing dialog.
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./info-tip.css";

interface InfoTipProps {
  title?: string;
  children: React.ReactNode;
}
interface TipBox {
  left: number;
  top: number;
}
export function InfoTip({ title, children }: InfoTipProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [box, setBox] = useState<TipBox | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const id = useId();
  const visible = open || hovered;

  useLayoutEffect(() => {
    if (!visible) return;
    const place = (): void => {
      if (!trigger.current || !panel.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const bounds = panel.current.getBoundingClientRect();
      const left = Math.max(
        12,
        Math.min(
          anchor.left + anchor.width / 2 - bounds.width / 2,
          window.innerWidth - bounds.width - 12,
        ),
      );
      const below = anchor.bottom + 10;
      const top =
        below + bounds.height <= window.innerHeight - 12
          ? below
          : Math.max(12, anchor.top - bounds.height - 10);
      setBox({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [visible, title, children]);

  useEffect(() => {
    if (!visible) return;
    const close = (): void => {
      setOpen(false);
      setHovered(false);
    };
    const onPointer = (event: MouseEvent): void => {
      if (!(event.target instanceof Node)) return;
      if (!trigger.current?.contains(event.target) && !panel.current?.contains(event.target))
        close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [visible]);

  return (
    <span
      ref={trigger}
      className="info-tip"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <button
        type="button"
        className="info-tip__trigger"
        aria-label="Plus d'informations"
        aria-expanded={visible}
        aria-describedby={visible ? id : undefined}
        onClick={() => {
          if (open) {
            setOpen(false);
            setHovered(false);
          } else {
            setOpen(true);
          }
        }}
      >
        i
      </button>
      {visible &&
        createPortal(
          <span
            ref={panel}
            id={id}
            role="tooltip"
            className="info-tip__panel"
            style={{
              left: box?.left ?? 0,
              top: box?.top ?? 0,
              visibility: box ? "visible" : "hidden",
            }}
          >
            {title && <span className="info-tip__title">{title}</span>}
            <span className="info-tip__body">{children}</span>
          </span>,
          document.body,
        )}
    </span>
  );
}
