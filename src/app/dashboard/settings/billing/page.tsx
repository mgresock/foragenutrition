"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tier = "free" | "pro";

function BillingContent() {
  const supabase = createClient();
  const params = useSearchParams();
  const [tier, setTier] = useState<Tier>("free");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<"monthly" | "yearly" | "trial" | null>(null);

  const success = params.get("success") === "true";
  const canceled = params.get("canceled") === "true";

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
      setTier((data?.subscription_tier as Tier) ?? "free");
      setLoading(false);
    };
    load();
  }, []);

  const upgrade = async (plan: "monthly" | "yearly", trial = false) => {
    setUpgrading(trial ? "trial" : plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, trial }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Something went wrong.");
        setUpgrading(null);
      }
    } catch {
      alert("Something went wrong. Try again.");
      setUpgrading(null);
    }
  };

  const isDev = email.toLowerCase() === "mcgresock@gmail.com";
  const isPro = tier === "pro" || isDev;

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-xl">
      <div className="mb-8">
        <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">Settings</p>
        <h1 className="font-display font-black text-3xl text-text-primary">Billing & Plan</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your Forage subscription.</p>
      </div>

      {success && (
        <div className="bg-lime/10 border border-lime/30 rounded-2xl p-4 mb-6 text-lime text-sm font-medium">
          ✓ Welcome to Forage Pro! Unlimited AI access is now active.
        </div>
      )}
      {canceled && (
        <div className="bg-amber-app/10 border border-amber-app/30 rounded-2xl p-4 mb-6 text-amber-app text-sm">
          Checkout canceled — you&apos;re still on the free plan.
        </div>
      )}

      {/* Current plan */}
      <div className={`rounded-2xl p-5 border mb-6 ${isPro ? "bg-lime/5 border-lime/20" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-text-primary">Current Plan</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPro ? "bg-lime/20 text-lime border border-lime/30" : "bg-surface text-text-muted border border-border"}`}>
            {isPro ? (isDev ? "Pro (Developer)" : "Pro") : "Free"}
          </span>
        </div>
        {loading ? (
          <div className="h-4 bg-surface rounded animate-pulse w-40" />
        ) : isPro ? (
          <p className="text-text-secondary text-sm">Unlimited AI requests · All features · Whoop sync</p>
        ) : (
          <p className="text-text-secondary text-sm">15 AI requests/month · Basic tracking</p>
        )}
      </div>

      {/* Upgrade options — hidden for pro users */}
      {!isPro && (
        <div className="space-y-3 mb-6">
          {/* Free trial — primary CTA */}
          <button onClick={() => upgrade("monthly", true)} disabled={!!upgrading}
            className="w-full p-5 bg-lime text-canvas rounded-2xl hover:bg-lime-glow transition-all text-left group disabled:opacity-50 shadow-lime-sm relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-black text-2xl text-canvas">7-Day Free Trial</span>
              <span className="px-2.5 py-1 bg-canvas/20 rounded-lg text-canvas text-xs font-bold">FREE</span>
            </div>
            <p className="text-canvas/70 text-sm mb-1">Then $6.99/month — cancel anytime before trial ends</p>
            <p className="text-canvas/60 text-xs">Unlimited AI · Restaurant picks · Whoop sync · All Pro features</p>
            {upgrading === "trial" && <p className="text-canvas/80 text-xs mt-2 font-medium">Redirecting to checkout…</p>}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs">or subscribe directly</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Monthly */}
          <button onClick={() => upgrade("monthly")} disabled={!!upgrading}
            className="w-full p-5 bg-card border border-border rounded-2xl hover:border-lime/30 transition-all text-left group disabled:opacity-50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-text-primary group-hover:text-lime transition-colors">Monthly</span>
              <span className="num font-display font-black text-2xl text-lime">$6.99<span className="text-text-muted text-sm font-normal">/mo</span></span>
            </div>
            <p className="text-text-muted text-xs">Unlimited AI · Restaurant picks · Whoop sync · Vitamin tracking</p>
            {upgrading === "monthly" && <p className="text-lime text-xs mt-2">Redirecting to checkout…</p>}
          </button>

          {/* Yearly */}
          <button onClick={() => upgrade("yearly")} disabled={!!upgrading}
            className="w-full p-5 bg-card border border-lime/20 rounded-2xl hover:border-lime/40 transition-all text-left group relative disabled:opacity-50">
            <span className="absolute top-3 right-3 px-2 py-0.5 bg-lime/20 border border-lime/30 rounded text-lime text-[10px] font-bold">BEST VALUE</span>
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-text-primary group-hover:text-lime transition-colors">Yearly</span>
              <span className="num font-display font-black text-2xl text-lime">$59.99<span className="text-text-muted text-sm font-normal">/yr</span></span>
            </div>
            <p className="text-text-muted text-xs">Everything in Monthly · Save $24/year vs monthly</p>
            {upgrading === "yearly" && <p className="text-lime text-xs mt-2">Redirecting to checkout…</p>}
          </button>
        </div>
      )}

      {/* Feature comparison */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-4">What&apos;s included</h3>
        <div className="space-y-3">
          {[
            { feature: "Calorie & macro tracking", free: true, pro: true },
            { feature: "AI food analysis (photo, describe, brand)", free: "15/month", pro: "Unlimited" },
            { feature: "Grocery AI list builder", free: "15/month", pro: "Unlimited" },
            { feature: "Restaurant healthy picks", free: false, pro: true },
            { feature: "Vitamin & mineral tracking", free: true, pro: true },
            { feature: "Whoop recovery sync", free: false, pro: true },
            { feature: "Friend circles & social", free: true, pro: true },
            { feature: "Water & supplement tracking", free: true, pro: true },
          ].map((row) => (
            <div key={row.feature} className="flex items-center gap-3">
              <p className="flex-1 text-text-secondary text-sm">{row.feature}</p>
              <span className={`text-xs w-16 text-right flex-shrink-0 ${row.free === false ? "text-text-muted/50" : "text-text-muted"}`}>
                {row.free === true ? "✓" : row.free === false ? "—" : row.free}
              </span>
              <span className={`text-xs w-20 text-right flex-shrink-0 font-medium ${row.pro ? "text-lime" : "text-text-muted"}`}>
                {row.pro === true ? "✓" : row.pro}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <p className="flex-1 text-text-muted text-xs">Plan</p>
            <span className="text-xs w-16 text-right text-text-muted flex-shrink-0">Free</span>
            <span className="text-xs w-20 text-right text-lime font-bold flex-shrink-0">Pro</span>
          </div>
        </div>
      </div>

      <p className="text-text-muted text-xs text-center mt-4">
        Payments powered by Stripe · Cancel anytime from Stripe dashboard
      </p>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8"><div className="h-8 w-48 bg-card rounded animate-pulse" /></div>}>
      <BillingContent />
    </Suspense>
  );
}
