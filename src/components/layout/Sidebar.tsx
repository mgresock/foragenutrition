"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageLogo } from "@/components/brand/ForageLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
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
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 2C6.13 2 3 5.13 3 9c0 2.97 1.74 5.53 4.26 6.78L7 18h6l-.26-2.22C15.26 14.53 17 11.97 17 9c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 6v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    href: "/dashboard/grocery",
    label: "Grocery AI",
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
  {
    href: "/dashboard/social",
    label: "Social",
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

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    load();
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-surface border-r border-border flex-col z-40">
        <div className="px-5 py-5 border-b border-border">
          <ForageLogo size={24} />
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-[10px] font-mono flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-0.5">
          <Link href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group border ${
              pathname.startsWith("/dashboard/settings")
                ? "bg-lime/10 text-lime border-lime/20"
                : "text-text-secondary hover:text-text-primary hover:bg-card border-transparent"
            }`}>
            <svg className="w-5 h-5 flex-shrink-0 text-text-muted group-hover:text-text-secondary" fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-medium">Settings</span>
          </Link>

          <Link href="/dashboard/social" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card transition-all">
            <UserAvatar src={profile?.avatar_url} size={32} className="ring-2 ring-border flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-text-primary text-sm font-medium truncate">{profile?.display_name || "You"}</div>
              <div className="text-text-muted text-xs truncate">{email}</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav — show 5 most important */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-all ${active ? "text-lime" : "text-text-muted"}`}>
              {item.icon}
              <span className="text-[9px] leading-none">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
