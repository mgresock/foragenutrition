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
  const [aiUsed, setAiUsed] = useState(0);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("success")) setSuccessMsg("You're now on Pro! Welcome to Forage Pro. 🎉");
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier, ai_requests_month")
        .eq("id", user.id)
        .single();
      setTier((data?.subscription_tier as "free" | "pro") ?? "free");
      setAiUsed(data?.ai_requests_month ?? 0);
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

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setPortalLoading(false);
  };

  const aiRemaining = Math.max(0, 15 - aiUsed);
  const aiPct = Math.min(100, (aiUsed / 15) * 100);

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Settings</Link>
      </div>
      <h1 className="font-display font-black text-3xl text-text-primary mb-1">Plan & Billing</h1>
      <p className="text-text-secondary text-sm mb-8">Manage your subscription and see what's included.</p>

      {successMsg && (
        <div className="mb-6 px-4 py-3 bg-lime/10 border border-lime/30 rounded-xl text-lime text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Current plan badge */}
      {tier !== null && (
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${tier === "pro" ? "bg-lime" : "bg-text-muted"}`} />
            <div>
              <p className="text-text-primary text-sm font-medium">
                {tier === "pro" ? "Forage Pro" : "Free Plan"}
              </p>
              {tier === "free" && (
                <p className="text-text-muted text-xs">{aiRemaining} of 15 AI requests remaining this month</p>
              )}
              {tier === "pro" && (
                <p className="text-text-muted text-xs">Unlimited AI · all features unlocked</p>
              )}
            </div>
          </div>
          {tier === "pro" && (
            <button onClick={handlePortal} disabled={portalLoading}
              className="text-xs text-text-secondary hover:text-text-primary border border-border hover:border-border-bright px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
              {portalLoading ? "Opening…" : "Manage →"}
            </button>
          )}
        </div>
      )}

      {/* AI usage bar — free only */}
      {tier === "free" && (
        <div className="mb-6 px-4 py-3 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-secondary text-xs">AI requests this month</span>
            <span className="num text-text-primary text-xs font-mono">{aiUsed} / 15</span>
          </div>
          <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${aiPct}%`, background: aiPct >= 100 ? "#ef4444" : aiPct >= 80 ? "#f0a030" : "#b6f040" }} />
          </div>
          {aiRemaining === 0 && (
            <p className="text-red-400 text-xs mt-2">Limit reached — upgrade to keep using AI features</p>
          )}
        </div>
      )}

      {/* Plan toggle — free only */}
      {tier === "free" && (
        <div className="flex bg-surface border border-border rounded-xl p-1 mb-6 w-fit">
          {(["monthly", "yearly"] as const).map((p) => (
            <button key={p} onClick={() => setPlan(p)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${plan === p ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
              {p === "monthly" ? "Monthly" : "Yearly"}
              {p === "yearly" && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-lime/20 text-lime rounded-full">Save 27%</span>}
            </button>
          ))}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Free */}
        <div className={`bg-card rounded-2xl p-5 border ${tier === "free" ? "border-border-bright" : "border-border"}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-display font-bold text-text-primary text-sm">Free</p>
            {tier === "free" && <span className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted">Current</span>}
          </div>
          <p className="num font-display font-black text-3xl text-text-primary mb-4">$0<span className="text-text-muted text-sm font-normal">/mo</span></p>
          <div className="space-y-2">
            {FEATURES_FREE.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-text-muted flex-shrink-0">·</span>{f}
              </div>
            ))}
          </div>
        </div>

        {/* Pro */}
        <div className={`bg-card rounded-2xl p-5 relative overflow-hidden border ${tier === "pro" ? "border-lime/40" : "border-lime/25"}`}>
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-lime text-canvas text-[10px] font-display font-bold rounded-full uppercase tracking-wide">
            Pro
          </div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-display font-bold text-text-primary text-sm">Forage Pro</p>
            {tier === "pro" && <span className="text-[10px] px-2 py-0.5 bg-lime/10 border border-lime/20 rounded-full text-lime mr-10">Current</span>}
          </div>
          <p className="num font-display font-black text-3xl text-lime mb-4">
            {plan === "monthly" || tier === "pro" ? "$7.99" : "$5.83"}
            <span className="text-text-muted text-sm font-normal">/mo</span>
            {plan === "yearly" && tier === "free" && <span className="text-text-muted text-xs font-normal ml-1">billed $69.99/yr</span>}
          </p>
          <div className="space-y-2 mb-4">
            {FEATURES_PRO.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-lime flex-shrink-0">✓</span>{f}
              </div>
            ))}
          </div>
          {tier === "free" && (
            <>
              <button onClick={() => handleUpgrade(false)} disabled={loading}
                className="w-full py-2.5 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50">
                {loading ? "Redirecting…" : "Upgrade to Pro →"}
              </button>
              <button onClick={() => handleUpgrade(true)} disabled={loading}
                className="w-full mt-2 py-2 text-lime text-xs hover:text-lime-glow transition-colors text-center">
                Start 7-day free trial
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-text-muted text-xs text-center">
        {tier === "free"
          ? "Secure checkout via Stripe · Cancel anytime · No hidden fees"
          : "To cancel or update payment method, click Manage above"}
      </p>
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
