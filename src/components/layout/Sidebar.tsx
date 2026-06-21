"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { ForageLogo } from "@/components/brand/ForageLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    shortLabel: "Home",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/calories",
    label: "Track Calories",
    shortLabel: "Calories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 2C6.13 2 3 5.13 3 9c0 2.97 1.74 5.53 4.26 6.78L7 18h6l-.26-2.22C15.26 14.53 17 11.97 17 9c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 6v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/grocery",
    label: "Grocery AI",
    shortLabel: "Grocery",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <path d="M3 4h2l2.5 8h7l2-6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="16" r="1.2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="14" cy="16" r="1.2" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    badge: "AI",
  },
  {
    href: "/dashboard/social",
    label: "Social",
    shortLabel: "Social",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 17c0-3.31 2.69-5 6-5s6 1.69 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 11c1.5 0 4 .8 4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SIDEBAR_EXTRA = [
  {
    href: "/dashboard/macros",
    label: "Macro Calc",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 6h6M7 10h2M11 10h2M7 13h2M11 13h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/supplements",
    label: "Supplements",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <rect x="2" y="7" width="16" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/restaurants",
    label: "Restaurants",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <path d="M6 2v6a3 3 0 003 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 2v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 2v4c0 1.1.9 2 2 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    badge: "AI",
  },
  {
    href: "/dashboard/receipts",
    label: "Receipts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <path d="M5 2h10a1 1 0 011 1v14l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const ALL_NAV = [...NAV, ...SIDEBAR_EXTRA];

const MORE_NAV = [
  {
    href: "/dashboard/macros",
    label: "Macro Calc",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 20 20">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 6h6M7 10h2M11 10h2M7 13h2M11 13h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/restaurants",
    label: "Restaurants",
    badge: "AI" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 20 20">
        <path d="M6 2v6a3 3 0 003 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 2v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 2v4c0 1.1.9 2 2 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/receipts",
    label: "Receipts",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 20 20">
        <path d="M5 2h10a1 1 0 011 1v14l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/supplements",
    label: "Supplements",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 20 20">
        <rect x="2" y="7" width="16" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const MORE_HREFS = MORE_NAV.map((i) => i.href);

type SidebarProfile = { display_name: string; avatar_url: string | null } | null;

export function Sidebar({ initialProfile = null }: { initialProfile?: SidebarProfile }) {
  const pathname = usePathname();
  const [profile] = useState<SidebarProfile>(initialProfile);
  const [showMore, setShowMore] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const currentPage = ALL_NAV.find((item) => isActive(item.href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-surface border-r border-border flex-col z-40 select-none">
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <ForageLogo size={24} />
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-lime">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
            Live
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {ALL_NAV.filter((item) => item.href !== "/dashboard/social").map((item, i) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                  active
                    ? "bg-lime/10 text-lime border border-lime/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-card border border-transparent"
                }`}>
                <span className={`transition-colors flex-shrink-0 ${active ? "text-lime" : "text-text-muted group-hover:text-text-secondary"}`}>
                  {item.icon}
                </span>
                <span className="font-medium flex-1">{item.label}</span>
                {"badge" in item && item.badge && (
                  <span className="px-1.5 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-[10px] font-mono flex-shrink-0">
                    {item.badge}
                  </span>
                )}
                <span className={`font-mono text-[10px] tabular-nums flex-shrink-0 ${active ? "text-lime/70" : "text-text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-0.5">
          <Link href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
              isActive("/dashboard/settings")
                ? "bg-lime/10 text-lime border border-lime/20"
                : "text-text-secondary hover:text-text-primary hover:bg-card border border-transparent"
            }`}>
            <span className={`transition-colors flex-shrink-0 ${isActive("/dashboard/settings") ? "text-lime" : "text-text-muted group-hover:text-text-secondary"}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-medium flex-1">Settings</span>
            <span className={`font-mono text-[10px] tabular-nums flex-shrink-0 ${isActive("/dashboard/settings") ? "text-lime/70" : "text-text-muted"}`}>07</span>
          </Link>
          <Link href="/dashboard/social" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            isActive("/dashboard/social")
              ? "bg-lime/10 border border-lime/20"
              : "hover:bg-card border border-transparent"
          }`}>
            <UserAvatar src={profile?.avatar_url} size={32} className={`ring-2 flex-shrink-0 ${isActive("/dashboard/social") ? "ring-lime/40" : "ring-border"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${isActive("/dashboard/social") ? "text-lime" : "text-text-primary"}`}>{profile?.display_name || "You"}</div>
              <div className="text-text-muted text-xs truncate">Social</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar — frosted glass */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-canvas/85 backdrop-blur-xl border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="h-14 flex items-center justify-between px-5">
          <ForageLogo size={20} />
          <span className="font-semibold text-text-primary tracking-tight" style={{ fontSize: 15 }}>
            {currentPage?.label ?? "Forage"}
          </span>
          <Link href="/dashboard/social">
            <UserAvatar src={profile?.avatar_url} size={30} className="ring-2 ring-border" />
          </Link>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/90 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex items-center justify-center" onClick={() => setShowMore(false)}>
                <div className={`flex flex-col items-center gap-[5px] px-3 py-2 rounded-2xl transition-all duration-200 ${active ? "bg-lime/10" : ""}`}>
                  <span className={`transition-colors duration-200 ${active ? "text-lime" : "text-text-muted"}`}>{item.icon}</span>
                  <span className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${active ? "text-lime" : "text-text-muted"}`}>{item.shortLabel}</span>
                </div>
              </Link>
            );
          })}
          {/* More tab */}
          <button className="flex-1 flex items-center justify-center" onClick={() => setShowMore((v) => !v)}>
            <div className={`flex flex-col items-center gap-[5px] px-3 py-2 rounded-2xl transition-all duration-200 ${
              showMore || MORE_HREFS.some((h) => isActive(h)) ? "bg-lime/10" : ""
            }`}>
              <span className={`transition-colors duration-200 ${showMore || MORE_HREFS.some((h) => isActive(h)) ? "text-lime" : "text-text-muted"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
                  <circle cx="4" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <span className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                showMore || MORE_HREFS.some((h) => isActive(h)) ? "text-lime" : "text-text-muted"
              }`}>More</span>
            </div>
          </button>
        </div>
      </nav>

      {/* More sheet — slides up above bottom nav */}
      {showMore && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div
            ref={sheetRef}
            className="lg:hidden fixed left-0 right-0 z-50 bg-surface border-t border-border rounded-t-3xl shadow-2xl"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="px-4 pt-2 pb-5">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-mono mb-3 px-1">More</p>
              <div className="grid grid-cols-2 gap-3">
                {MORE_NAV.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                        active
                          ? "bg-lime/10 border-lime/20"
                          : "bg-card border-border hover:border-border-bright"
                      }`}
                    >
                      <span className={active ? "text-lime" : "text-text-muted"}>{item.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${active ? "text-lime" : "text-text-primary"}`}>{item.label}</p>
                        {"badge" in item && item.badge && (
                          <span className="text-[9px] font-mono text-lime/70">✦ AI</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
