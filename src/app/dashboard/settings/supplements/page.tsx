"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSupplementEffect } from "@/lib/supplementEffects";

interface Supplement {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  timing: string;
  active: boolean;
}

const TIMINGS = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "pre-workout", label: "Pre-workout" },
  { value: "post-workout", label: "Post-workout" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Before bed" },
];

const FREQUENCIES = [
  { value: "once daily", label: "Once daily" },
  { value: "twice daily", label: "Twice daily" },
  { value: "3x daily", label: "3× daily" },
  { value: "with meals", label: "With meals" },
  { value: "as needed", label: "As needed" },
  { value: "weekly", label: "Weekly" },
];

const RECOMMENDED = [
  { name: "Creatine Monohydrate", dose: "5g", timing: "post-workout", frequency: "once daily", emoji: "💪", why: "The most research-backed supplement. Increases strength, power output, and lean muscle mass." },
  { name: "Whey Protein", dose: "1 scoop (25g)", timing: "post-workout", frequency: "once daily", emoji: "🥛", why: "Fast-absorbing complete protein — ideal for muscle repair within 30 min of training." },
  { name: "Vitamin D3", dose: "2000 IU", timing: "morning", frequency: "once daily", emoji: "☀️", why: "Most gym-goers are deficient. Critical for testosterone, immune function, and bone density." },
  { name: "Omega-3 Fish Oil", dose: "1000mg", timing: "morning", frequency: "once daily", emoji: "🐟", why: "Reduces training-induced inflammation and supports heart, brain, and joint health." },
  { name: "Magnesium Glycinate", dose: "400mg", timing: "night", frequency: "once daily", emoji: "😴", why: "Improves deep sleep and REM. Reduces muscle cramps and nighttime cortisol." },
  { name: "Zinc", dose: "15mg", timing: "evening", frequency: "once daily", emoji: "⚡", why: "Supports testosterone production, immune function, and recovery from hard training." },
  { name: "Vitamin C", dose: "500mg", timing: "morning", frequency: "once daily", emoji: "🍊", why: "Antioxidant that supports collagen synthesis, immunity, and iron absorption." },
  { name: "Caffeine", dose: "200mg", timing: "pre-workout", frequency: "as needed", emoji: "☕", why: "Proven ergogenic — boosts strength and endurance by 10–15%. Take 30–60 min before training." },
  { name: "Beta-Alanine", dose: "3.2g", timing: "pre-workout", frequency: "once daily", emoji: "🔥", why: "Buffers lactic acid in muscles, extending time to fatigue during high-rep sets." },
  { name: "Ashwagandha", dose: "600mg", timing: "evening", frequency: "once daily", emoji: "🌿", why: "Adaptogen that reduces cortisol, improves recovery, sleep quality, and testosterone levels." },
  { name: "Collagen Peptides", dose: "10g", timing: "morning", frequency: "once daily", emoji: "🦴", why: "Supports tendons, ligaments, and joint cartilage — key for heavy compound lifts." },
  { name: "Melatonin", dose: "0.5mg", timing: "night", frequency: "as needed", emoji: "🌙", why: "Sleep onset aid. Low dose (0.5mg) is more effective than 5–10mg tabs." },
];

export default function SupplementsPage() {
  const supabase = createClient();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingRec, setAddingRec] = useState<string | null>(null);
  const [addError, setAddError] = useState("");

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("once daily");
  const [timing, setTiming] = useState("any");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("supplements")
        .select("id, name, dose, frequency, timing, active")
        .eq("user_id", user.id)
        .order("created_at")
        .limit(200);
      if (data) setSupplements(data);
      setLoading(false);
    };
    load();
  }, []);

  const addSupplement = async (overrides?: { name: string; dose: string; timing: string; frequency: string }) => {
    const n = overrides?.name ?? name.trim();
    if (!n) return;
    if (overrides) setAddingRec(n);
    else setSaving(true);
    setAddError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setAddingRec(null); return; }

    const payload = {
      user_id: user.id,
      name: n,
      dose: (overrides?.dose ?? dose.trim()) || null,
      frequency: overrides?.frequency ?? frequency,
      timing: overrides?.timing ?? timing,
      active: true,
    };

    let { data, error } = await supabase
      .from("supplements")
      .insert(payload)
      .select("id, name, dose, frequency, timing, active")
      .single();

    // If frequency column doesn't exist yet, retry without it
    if (error?.message?.includes("frequency")) {
      const { frequency: _freq, ...payloadWithoutFreq } = payload;
      const retry = await supabase
        .from("supplements")
        .insert(payloadWithoutFreq)
        .select("id, name, dose, timing, active")
        .single();
      data = retry.data ? { frequency: "once daily", ...retry.data } : null;
      error = retry.error;
    }

    if (!error && data) {
      setSupplements((prev) => [...prev, data]);
      if (!overrides) { setName(""); setDose(""); setFrequency("once daily"); setTiming("any"); }
    } else if (error) {
      setAddError(error.message);
    }
    setSaving(false);
    setAddingRec(null);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("supplements").update({ active: !active }).eq("id", id);
    setSupplements((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s));
  };

  const deleteSupplement = async (id: string) => {
    await supabase.from("supplements").delete().eq("id", id);
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  };

  const timingLabel = (t: string) => TIMINGS.find((x) => x.value === t)?.label ?? t;
  const alreadyAdded = (n: string) => supplements.some((s) => s.name.toLowerCase() === n.toLowerCase());

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors mb-4 inline-block">← Settings</Link>
        <h1 className="font-display font-black text-3xl text-text-primary">Supplements</h1>
        <p className="text-text-secondary mt-1 text-sm">Build your stack. Active supplements show as daily reminders on your dashboard.</p>
      </div>

      {/* Recommendations */}
      <div className="mb-8">
        <h2 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-3">Recommended for Gym-Goers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RECOMMENDED.map((rec) => {
            const added = alreadyAdded(rec.name);
            return (
              <div key={rec.name} className={`bg-card border rounded-2xl p-4 transition-all ${added ? "border-lime/20" : "border-border hover:border-border-bright"}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{rec.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-text-primary text-sm font-medium leading-tight">{rec.name}</p>
                      <button
                        onClick={() => !added && addSupplement(rec)}
                        disabled={added || addingRec === rec.name}
                        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          added
                            ? "bg-lime/10 text-lime border border-lime/20 cursor-default"
                            : "bg-surface border border-border text-text-secondary hover:border-lime/40 hover:text-lime"
                        }`}
                      >
                        {added ? "✓" : addingRec === rec.name ? "…" : "+ Add"}
                      </button>
                    </div>
                    <p className="text-text-muted text-[10px] mb-1.5">{rec.dose} · {rec.frequency} · {timingLabel(rec.timing)}</p>
                    <p className="text-text-muted/70 text-[10px] leading-relaxed mb-1.5">{rec.why}</p>
                    {getSupplementEffect(rec.name)?.tag && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-lime/10 border border-lime/20 rounded-full text-lime text-[9px] font-medium">
                        💊 {getSupplementEffect(rec.name)!.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add custom */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-8 space-y-4">
        <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">Add Custom</h2>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSupplement()}
            placeholder="e.g. Berberine, NAC, Colostrum…"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Amount per dose</label>
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="e.g. 5g, 1 cap, 2000 IU"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-lime/50 transition-all"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Timing</label>
          <div className="flex flex-wrap gap-2">
            {TIMINGS.map((t) => (
              <button key={t.value} onClick={() => setTiming(t.value)}
                className={`px-3 py-2 rounded-xl text-xs border transition-all ${timing === t.value ? "bg-lime/10 border-lime/40 text-lime font-medium" : "bg-surface border-border text-text-secondary hover:border-border-bright"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {addError && (
          <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{addError}</p>
        )}

        <button
          onClick={() => addSupplement()}
          disabled={!name.trim() || saving}
          className="w-full py-3 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all disabled:opacity-40"
        >
          {saving ? "Adding…" : "Add to Stack"}
        </button>
      </div>

      {/* Your stack */}
      <h2 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-3">Your Stack</h2>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
      ) : supplements.length === 0 ? (
        <div className="text-center py-10 bg-card border border-border rounded-2xl">
          <p className="text-4xl mb-3">💊</p>
          <p className="text-text-muted text-sm">No supplements added yet.</p>
          <p className="text-text-muted text-xs mt-1">Add from recommendations above or enter a custom one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {supplements.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${s.active ? "bg-card border-border" : "bg-surface border-border opacity-50"}`}>
              <button
                onClick={() => toggleActive(s.id, s.active)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  s.active ? "bg-lime border-lime" : "border-border bg-transparent"
                }`}
              >
                {s.active && <span className="text-canvas text-[10px] font-bold leading-none">✓</span>}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{s.name}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {s.dose && <span className="text-text-secondary">{s.dose}</span>}
                  {s.dose && " · "}
                  <span>{s.frequency ?? "once daily"}</span>
                  {" · "}
                  <span>{timingLabel(s.timing)}</span>
                  {!s.active && <span className="ml-1 text-text-muted/50">(inactive)</span>}
                </p>
                {s.active && getSupplementEffect(s.name)?.tag && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-lime/10 border border-lime/20 rounded-full text-lime text-[9px] font-medium">
                    💊 {getSupplementEffect(s.name)!.tag}
                  </span>
                )}
              </div>

              <button
                onClick={() => deleteSupplement(s.id)}
                className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center hover:bg-red-500/20 transition-all flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          <p className="text-text-muted text-xs text-center mt-3">
            {supplements.filter((s) => s.active).length} active · toggle to show/hide on dashboard
          </p>
        </div>
      )}
    </div>
  );
}
