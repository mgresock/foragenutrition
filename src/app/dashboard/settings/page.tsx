"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon, type IconName } from "@/components/ui/Icon";

const SETTINGS: { label: string; desc: string; href: string; badge?: string; icon: IconName; tint: string }[] = [
  { label: "Plan & Billing", desc: "Upgrade to Pro · manage subscription", href: "/dashboard/settings/billing", badge: "Upgrade", icon: "billing", tint: "#FF9F0A" },
  { label: "Profile & Body Stats", desc: "Age, height, weight, biological sex", href: "/dashboard/settings/profile", icon: "user", tint: "#2f9e44" },
  { label: "Nutrition Goals", desc: "Goals and meals per week", href: "/dashboard/settings/goals", icon: "target", tint: "#32ADE6" },
  { label: "Grocery Preferences", desc: "Budget and ZIP code", href: "/dashboard/settings/grocery", icon: "cart", tint: "#a78bfa" },
  { label: "Supplements", desc: "Your daily supplement stack", href: "/dashboard/settings/supplements", icon: "pill", tint: "#2f9e44" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your profile, goals, and preferences.</p>
      </div>

      <div className="space-y-4">
        {SETTINGS.map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-border-bright hover:-translate-y-0.5 transition-all cursor-pointer group block">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.tint}1f`, border: `1px solid ${s.tint}33`, color: s.tint }}><Icon name={s.icon} className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-text-primary text-sm group-hover:text-lime transition-colors">{s.label}</h3>
                {"badge" in s && s.badge && (
                  <span className="px-1.5 py-0.5 bg-amber-app/10 border border-amber-app/30 rounded text-amber-app text-[10px] font-mono uppercase tracking-wider">{s.badge}</span>
                )}
              </div>
              <p className="text-text-muted text-xs mt-0.5">{s.desc}</p>
            </div>
            <svg className="w-4 h-4 text-text-muted group-hover:text-text-secondary group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 16 16">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}

        <div className="pt-4">
          <button onClick={handleSignOut} className="text-red-400 text-sm hover:text-red-300 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
