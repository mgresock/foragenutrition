"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

const QUICK_PICKS = [50, 100, 200, 300, 500];

export default function BudgetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [noBudget, setNoBudget] = useState(true);
  const [budget, setBudget] = useState(150);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      weekly_budget: noBudget ? null : budget,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/onboarding/goals");
  };

  return (
    <OnboardingShell step={3} totalSteps={4} title="What's your weekly grocery budget?" subtitle="We'll optimize your shopping list to hit your nutrition goals without breaking the bank.">
      <div className="space-y-6">
        <button onClick={() => setNoBudget((p) => !p)}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${noBudget ? "bg-lime/10 border-lime/40" : "bg-surface border-border hover:border-border-bright"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${noBudget ? "border-lime bg-lime" : "border-border"}`}>
              {noBudget && <svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span className={`text-sm font-medium ${noBudget ? "text-lime" : "text-text-secondary"}`}>No budget — show me the best options</span>
          </div>
          <span className="text-text-muted text-xs">(recommended)</span>
        </button>

        <div className={`space-y-5 transition-all duration-300 ${noBudget ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-baseline gap-2">
            <span className="num font-display font-black text-5xl text-text-primary">${budget}</span>
            <span className="text-text-secondary text-sm">/ week</span>
          </div>
          <div className="relative">
            <input type="range" min={10} max={500} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full"
              style={{ background: `linear-gradient(to right, #34C759 0%, #34C759 ${((budget - 10) / 490) * 100}%, #2C2C2E ${((budget - 10) / 490) * 100}%, #2C2C2E 100%)` }} />
            <div className="flex justify-between mt-1">
              <span className="text-text-muted text-xs font-mono">$10</span>
              <span className="text-text-muted text-xs font-mono">$500+</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_PICKS.map((v) => (
              <button key={v} onClick={() => setBudget(v)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${budget === v ? "bg-lime/10 border-lime/40 text-lime font-medium" : "bg-surface border-border text-text-secondary hover:border-border-bright"}`}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleNext} disabled={loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <><ForageSpinner size={16} onLight />Saving...</> : "Continue →"}
        </button>
      </div>
    </OnboardingShell>
  );
}
