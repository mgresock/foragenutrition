"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default function LocationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<{ city: string; state: string } | null>(null);
  const [error, setError] = useState("");

  const verifyZip = async () => {
    if (zip.length < 5) return;
    setLoading(true);
    // Basic format check — full geocoding wired in later via API
    await new Promise((r) => setTimeout(r, 400));
    setVerified({ city: "Your area", state: zip });
    setLoading(false);
  };

  const handleNext = async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      zip_code: zip,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/onboarding/budget");
  };

  return (
    <OnboardingShell step={2} totalSteps={4} title="Where are you located?" subtitle="We'll find grocery stores near you and compare prices to build your optimal shopping list.">
      <div className="space-y-5">
        <div>
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">ZIP Code</label>
          <div className="flex gap-3">
            <input type="text" value={zip}
              onChange={(e) => { setZip(e.target.value.replace(/\D/g, "").slice(0, 5)); setVerified(null); }}
              placeholder="73301" maxLength={5}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 focus:shadow-lime-sm transition-all num font-mono tracking-[0.2em] text-lg" />
            <button onClick={verifyZip} disabled={zip.length < 5 || loading}
              className="px-5 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:border-border-bright hover:text-text-primary transition-all disabled:opacity-40">
              {loading ? <span className="w-4 h-4 border-2 border-text-muted/30 border-t-text-secondary rounded-full animate-spin block" /> : "Verify"}
            </button>
          </div>
        </div>

        {verified && (
          <div className="flex items-center gap-3 bg-lime/10 border border-lime/30 rounded-xl px-4 py-3 animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-lime" fill="none" viewBox="0 0 14 14">
                <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lime font-medium text-sm">ZIP {verified.state} — looks good!</span>
          </div>
        )}

        <div className="flex items-start gap-3 bg-surface border border-border rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 16 16">
            <path d="M8 1l5.5 2v4.5C13.5 11 11 14 8 15 5 14 2.5 11 2.5 7.5V3L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <p className="text-text-muted text-xs leading-relaxed">Your exact location is never stored. We only use your ZIP to find nearby stores and regional pricing data.</p>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleNext} disabled={!verified || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />Saving...</> : "Continue →"}
        </button>

        <button onClick={() => router.push("/onboarding/budget")} className="w-full py-3 text-text-muted text-sm hover:text-text-secondary transition-colors">
          Skip for now
        </button>
      </div>
    </OnboardingShell>
  );
}
