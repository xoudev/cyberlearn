"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBell = NotificationBell;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const utils_js_1 = require("../lib/utils.js");
/**
 * Bell icon with an unread count badge.
 * Designed for use in the Navbar.
 */
function NotificationBell({ unreadCount = 0, onClick, className }) {
  const [hovered, setHovered] = (0, react_1.useState)(false);
  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);
  return (0, jsx_runtime_1.jsxs)("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    className: (0, utils_js_1.cn)(
      "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      className,
    ),
    style: {
      color: hovered ? "var(--color-text-primary)" : "var(--color-text-secondary)",
      backgroundColor: hovered
        ? "color-mix(in srgb, var(--color-text-primary) 8%, transparent)"
        : "transparent",
    },
    "aria-label": hasUnread
      ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
      : "Notifications",
    children: [
      (0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { size: 18, strokeWidth: 1.75 }),
      hasUnread &&
        (0, jsx_runtime_1.jsx)("span", {
          className:
            "absolute right-0.5 top-0.5 flex items-center justify-center rounded-full font-bold leading-none",
          style: {
            minWidth: "17px",
            height: "17px",
            padding: "0 4px",
            fontSize: "10px",
            background:
              "linear-gradient(135deg, var(--color-danger), color-mix(in srgb, var(--color-danger) 75%, #ff6b6b))",
            color: "#ffffff",
            boxShadow: "0 0 0 2px var(--color-bg-base)",
          },
          "aria-hidden": "true",
          children: displayCount,
        }),
    ],
  });
}
//# sourceMappingURL=notification-bell.js.map
