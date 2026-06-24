// Clean line-icon set — replaces decorative emojis for a more refined,
// professional look. Icons are decorative by default (aria-hidden), since they
// always accompany a text label; pass `title` to give a standalone icon a name.

import type { ReactNode } from "react";

export type IconName =
  | "meal" | "search" | "camera" | "edit" | "barcode" | "cart" | "receipt"
  | "chart" | "calculator" | "pill" | "user" | "users" | "billing" | "flame"
  | "droplet" | "target" | "dumbbell" | "store" | "sparkle" | "plus" | "info"
  | "scale" | "trophy" | "check" | "lock" | "leaf" | "calendar" | "dollar"
  | "clock" | "bolt" | "wallet";

const P: Record<IconName, ReactNode> = {
  meal: <><path d="M5 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M19 3v18M19 3a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  camera: <><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></>,
  edit: <><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z" /><path d="M14 6l3 3" /></>,
  barcode: <><path d="M4 6v12M8 6v12M11 6v12M14 6v12M17 6v12M20 6v12" /></>,
  cart: <><path d="M3 4h2l2.2 11a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 8H6" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></>,
  receipt: <><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><path d="M9 8h6M9 12h6" /></>,
  chart: <><path d="M4 20V10M9 20V5M14 20v-8M19 20V8" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M11 11h2M14 11h2M8 15h2M11 15h2M14 15h2" /></>,
  pill: <><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5a3 3 0 0 1 0 6M18 20c0-2.4-1-4-3-4.6" /></>,
  billing: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
  flame: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .4-1.8 1-2.5C9.2 11 12 9 12 3z" /></>,
  droplet: <><path d="M12 3c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10z" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
  dumbbell: <><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></>,
  store: <><path d="M4 9l1-5h14l1 5M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M5 9v11h14V9" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>,
  scale: <><path d="M12 4v16M6 20h12M5 9h14l-2.5 5h-9z" /><circle cx="12" cy="4" r="1.3" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M10 14h4M9 20h6M12 14v6" /></>,
  check: <><path d="M5 12l4.5 4.5L19 7" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  leaf: <><path d="M5 19c0-8 6-13 14-14 .5 8-4 14-12 14a6 6 0 0 1-2-.3z" /><path d="M9 15c2-2 4-3.5 7-4.5" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  dollar: <><path d="M12 3v18M16 7c0-2-2-3-4-3s-4 1-4 3 2 2.5 4 3 4 1 4 3-2 3-4 3-4-1-4-3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <><path d="M13 3 5 13h5l-1 8 8-10h-5z" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h13a2 2 0 0 1 0 4H3M16 12h.01" /></>,
};

export function Icon({ name, className = "w-5 h-5", size, title, strokeWidth = 1.75 }: {
  name: IconName;
  className?: string;
  size?: number;
  title?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
