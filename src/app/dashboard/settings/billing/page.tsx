"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const FEATURES_FREE = [
  "15 AI requests / month",
  "Calorie & macro tracking",
  "Water & supplement logging",
  "Grocery store finder",
  "Social friend circle",
];

const FEATURES_PRO = [
  "Unlimited AI requests",
  "AI photo food analysis",
  "AI grocery list builder",
  "AI restaurant picks",
  "Receipt scanner",
  "AI nutrition coaching",
  "Everything in Free",
];

function BillingContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [tier, setTier] = useState<"free" | "pro" | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("success")) setSuccessMsg("You're now on Pro! Welcome to Forage Pro. 🎉");
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
      setTier((data?.subscription_tier as "free" | "pro") ?? "free");
    };
    load();
  }, []);

  const handleUpgrade = async (withTrial = false) => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, trial: withTrial }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  };

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Settings</Link>
      </div>
      <h1 className="font-display font-black text-3xl text-text-primary mb-1">Plan & Billing</h1>
      <p className="text-text-secondary text-sm mb-8">Unlock unlimited AI features with Forage Pro.</p>

      {successMsg && (
        <div className="mb-6 px-4 py-3 bg-lime/10 border border-lime/30 rounded-xl text-lime text-sm font-medium">
          {successMsg}
        </div>
      )}

      {tier === "pro" ? (
        <div className="bg-card border border-lime/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-lime/20 border border-lime/30 flex items-center justify-center">
              <span className="text-lime text-sm">✓</span>
            </div>
            <div>
              <p className="font-display font-bold text-text-primary">You're on Forage Pro</p>
              <p className="text-text-muted text-xs">Unlimited AI requests · all features unlocked</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURES_PRO.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-lime text-xs flex-shrink-0">✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Plan toggle */}
          <div className="flex bg-surface border border-border rounded-xl p-1 mb-6 w-fit">
            {(["monthly", "yearly"] as const).map((p) => (
              <button key={p} onClick={() => setPlan(p)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${plan === p ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
                {p === "monthly" ? "Monthly" : "Yearly"}
                {p === "yearly" && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-lime/20 text-lime rounded-full">Save 28%</span>}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Free */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="font-display font-bold text-text-primary text-sm mb-1">Free</p>
              <p className="num font-display font-black text-3xl text-text-primary mb-4">$0<span className="text-text-muted text-sm font-normal">/mo</span></p>
              <div className="space-y-2 mb-4">
                {FEATURES_FREE.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-text-muted flex-shrink-0">·</span>{f}
                  </div>
                ))}
              </div>
              <div className="w-full py-2.5 rounded-xl text-center text-xs text-text-muted border border-border">
                Current plan
              </div>
            </div>

            {/* Pro */}
            <div className="bg-card border border-lime/25 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-lime text-canvas text-[10px] font-display font-bold rounded-full uppercase tracking-wide">
                Pro
              </div>
              <p className="font-display font-bold text-text-primary text-sm mb-1">Forage Pro</p>
              <p className="num font-display font-black text-3xl text-lime mb-4">
                {plan === "monthly" ? "$6.99" : "$4.99"}<span className="text-text-muted text-sm font-normal">/{plan === "monthly" ? "mo" : "mo"}</span>
                {plan === "yearly" && <span className="text-text-muted text-xs font-normal ml-1">billed $59.99/yr</span>}
              </p>
              <div className="space-y-2 mb-4">
                {FEATURES_PRO.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-lime flex-shrink-0">✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => handleUpgrade(false)} disabled={loading}
                className="w-full py-2.5 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50">
                {loading ? "Redirecting…" : `Upgrade to Pro →`}
              </button>
              <button onClick={() => handleUpgrade(true)} disabled={loading}
                className="w-full mt-2 py-2 text-lime text-xs hover:text-lime-glow transition-colors text-center">
                Start 7-day free trial
              </button>
            </div>
          </div>

          <p className="text-text-muted text-xs text-center">
            Secure checkout via Stripe · Cancel anytime · No hidden fees
          </p>
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}
