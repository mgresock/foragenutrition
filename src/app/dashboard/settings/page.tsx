"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SETTINGS = [
  { label: "Plan & Billing", desc: "Upgrade to Pro · manage subscription", href: "/dashboard/settings/billing", badge: "Upgrade" },
  { label: "Profile & Body Stats", desc: "Age, height, weight, biological sex", href: "/dashboard/settings/profile" },
  { label: "Nutrition Goals", desc: "Goals and meals per week", href: "/dashboard/settings/goals" },
  { label: "Grocery Preferences", desc: "Budget and ZIP code", href: "/dashboard/settings/grocery" },
  { label: "Supplements", desc: "Your daily supplement stack", href: "/dashboard/settings/supplements" },
  { label: "Whoop", desc: "Sync recovery, HRV, and sleep data", href: "/dashboard/settings/whoop", badge: "Connect" },
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
            className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-border-bright transition-all cursor-pointer group block">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-text-primary text-sm">{s.label}</h3>
                {"badge" in s && s.badge && (
                  <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">{s.badge}</span>
                )}
              </div>
              <p className="text-text-muted text-xs mt-0.5">{s.desc}</p>
            </div>
            <svg className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" viewBox="0 0 16 16">
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
