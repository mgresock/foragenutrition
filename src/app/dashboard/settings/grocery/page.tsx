"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import Link from "next/link";

const QUICK_PICKS = [50, 100, 150, 200, 300, 500];

export default function EditGroceryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [zip, setZip] = useState("");
  const [noBudget, setNoBudget] = useState(true);
  const [budget, setBudget] = useState(150);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data } = await supabase.from("onboarding").select("zip_code, weekly_budget").eq("user_id", user.id).single();
      if (data) {
        setZip(data.zip_code || "");
        if (data.weekly_budget !== null && data.weekly_budget !== undefined) {
          setNoBudget(false);
          setBudget(data.weekly_budget);
        }
      }
      setFetching(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      zip_code: zip || null,
      weekly_budget: noBudget ? null : budget,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    setSaved(true);
    setLoading(false);
  };

  if (fetching) return <div className="px-6 py-8 text-text-muted text-sm">Loading...</div>;

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-lg">
      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors mb-4 inline-block">← Settings</Link>
        <h1 className="font-display font-black text-3xl text-text-primary">Grocery Preferences</h1>
        <p className="text-text-secondary mt-1">Change your location or budget at any time.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">ZIP Code</label>
          <input type="text" value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="73301" maxLength={5}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all font-mono tracking-[0.2em] text-lg" />
          <p className="text-text-muted text-xs mt-2">Used to find local store prices. Never shared.</p>
        </div>

        <div className="space-y-4">
          <label className="block text-xs text-text-secondary uppercase tracking-wider">Weekly Grocery Budget</label>

          <button onClick={() => setNoBudget((p) => !p)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${noBudget ? "bg-lime/10 border-lime/40" : "bg-surface border-border hover:border-border-bright"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${noBudget ? "border-lime bg-lime" : "border-border"}`}>
                {noBudget && <svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className={`text-sm font-medium ${noBudget ? "text-lime" : "text-text-secondary"}`}>No budget — show me the best options</span>
            </div>
          </button>

          <div className={`space-y-4 transition-all duration-300 ${noBudget ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            <div className="flex items-baseline gap-2">
              <span className="num font-display font-black text-5xl text-text-primary">${budget}</span>
              <span className="text-text-secondary text-sm">/ week</span>
            </div>
            <input type="range" min={10} max={500} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full"
              style={{ background: `linear-gradient(to right, #b6f040 0%, #b6f040 ${((budget - 10) / 490) * 100}%, #2a3020 ${((budget - 10) / 490) * 100}%, #2a3020 100%)` }} />
            <div className="flex gap-2 flex-wrap">
              {QUICK_PICKS.map((v) => (
                <button key={v} onClick={() => { setBudget(v); setNoBudget(false); }}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${budget === v && !noBudget ? "bg-lime/10 border-lime/40 text-lime font-medium" : "bg-surface border-border text-text-secondary hover:border-border-bright"}`}>
                  ${v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}
        {saved && <p className="text-lime text-sm bg-lime/10 border border-lime/20 rounded-lg px-4 py-2">Saved successfully.</p>}

        <button onClick={handleSave} disabled={loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <><ForageSpinner size={16} onLight />Saving...</> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
