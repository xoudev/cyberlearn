"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "../lib/utils.js";

interface NotificationBellProps {
  /** Number of unread notifications - hides the badge when 0 */
  unreadCount?: number;
  /** Called when the bell icon is clicked */
  onClick?: () => void;
  className?: string;
}

/**
 * Bell icon with an unread count badge.
 * Designed for use in the Navbar.
 */
export function NotificationBell({ unreadCount = 0, onClick, className }: NotificationBellProps) {
  const [hovered, setHovered] = useState(false);
  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
      style={{
        color: hovered ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        backgroundColor: hovered
          ? "color-mix(in srgb, var(--color-text-primary) 8%, transparent)"
          : "transparent",
      }}
      aria-label={
        hasUnread
          ? `${String(unreadCount)} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
          : "Notifications"
      }
    >
      <Bell size={18} strokeWidth={1.75} />

      {hasUnread && (
        <span
          className="absolute right-0.5 top-0.5 flex items-center justify-center rounded-full font-bold leading-none"
          style={{
            minWidth: "17px",
            height: "17px",
            padding: "0 4px",
            fontSize: "10px",
            background:
              "linear-gradient(135deg, var(--color-danger), color-mix(in srgb, var(--color-danger) 75%, #ff6b6b))",
            color: "#ffffff",
            boxShadow: "0 0 0 2px var(--color-bg-base)",
          }}
          aria-hidden="true"
        >
          {displayCount}
        </span>
      )}
    </button>
  );
}
