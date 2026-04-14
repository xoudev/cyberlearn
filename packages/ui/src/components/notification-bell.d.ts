interface NotificationBellProps {
  /** Number of unread notifications — hides the badge when 0 */
  unreadCount?: number;
  /** Called when the bell icon is clicked */
  onClick?: () => void;
  className?: string;
}
/**
 * Bell icon with an unread count badge.
 * Designed for use in the Navbar.
 */
export declare function NotificationBell({
  unreadCount,
  onClick,
  className,
}: NotificationBellProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=notification-bell.d.ts.map
