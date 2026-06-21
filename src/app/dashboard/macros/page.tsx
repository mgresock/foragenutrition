"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import {
  computeTargets, goalFromGoals, ACTIVITY_OPTIONS, GOAL_OPTIONS,
  type ActivityKey, type GoalKey, type Sex,
} from "@/lib/nutrition";

export default function MacroCalculatorPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("28");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState<ActivityKey>("moderate");
  const [goal, setGoal] = useState<GoalKey>("maintain");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "needs_migration">("idle");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("onboarding").select("*").eq("user_id", user.id).single();
      const ob = data as Record<string, unknown> | null;
      if (ob) {
        if (ob.sex) setSex(String(ob.sex).toLowerCase().startsWith("f") ? "female" : "male");
        if (ob.age) setAge(String(ob.age));
        if (ob.height_cm) setHeight(String(ob.height_cm));
        if (ob.weight_kg) setWeight(String(ob.weight_kg));
        if (ob.activity_level && ACTIVITY_OPTIONS.some((a) => a.key === ob.activity_level)) setActivity(ob.activity_level as ActivityKey);
        setGoal(goalFromGoals(ob.goals));
      }
      setLoading(false);
    })();
  }, [supabase]);

  const t = computeTargets({
    sex, age: Number(age), height_cm: Number(height), weight_kg: Number(weight), activity, goal,
  });

  const apply = async () => {
    setSaveState("saving");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveState("idle"); return; }
    // Persist the entered body stats (these columns always exist on onboarding).
    await supabase.from("onboarding").update({
      sex, age: Number(age) || null, height_cm: Number(height) || null, weight_kg: Number(weight) || null,
    }).eq("user_id", user.id);

    const { error } = await supabase.from("onboarding").update({
      activity_level: activity,
      daily_calorie_target: t.calories,
      protein_target: t.protein_g,
      carbs_target: t.carbs_g,
      fat_target: t.fat_g,
      targets_updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    if (error) {
      // Columns may not exist until db/feature-tables.sql is applied.
      setSaveState(error.message.toLowerCase().includes("column") ? "needs_migration" : "idle");
      return;
    }
    // Seed a bodyweight point for the adaptive engine (no-op if table absent).
    if (Number(weight) > 0) {
      await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: Number(weight) }).then(() => {}, () => {});
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><ForageSpinner size={32} /></div>;
  }

  const macros = [
    { label: "Protein", v: t.protein_g, kcal: t.protein_g * 4, color: "bg-lime", text: "text-lime" },
    { label: "Carbs", v: t.carbs_g, kcal: t.carbs_g * 4, color: "bg-amber-app", text: "text-amber-app" },
    { label: "Fats", v: t.fat_g, kcal: t.fat_g * 9, color: "bg-cyan-app", text: "text-cyan-app" },
  ];

  return (
    <div className="px-5 sm:px-8 py-8 pb-24 lg:pb-8 max-w-5xl">
      <p className="text-lime text-xs font-mono uppercase tracking-[0.2em] mb-1.5">Reference · Recalibrate</p>
      <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-[0.95] text-text-primary">Macro Calculator</h1>
      <p className="text-text-secondary mt-2 mb-8">Mifflin-St Jeor TDEE with activity multipliers and a protein-first split.</p>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Inputs */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Inputs · Profile</p>

          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Sex</label>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button key={s} onClick={() => setSex(s)}
                  className={`py-3 rounded-xl text-sm font-display font-bold uppercase tracking-wider transition-all ${sex === s ? "bg-lime text-canvas" : "bg-surface border border-border text-text-secondary hover:text-text-primary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Age", v: age, set: setAge, unit: "yr" },
              { label: "Height", v: height, set: setHeight, unit: "cm" },
              { label: "Weight", v: weight, set: setWeight, unit: "kg" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">{f.label}</label>
                <div className="relative">
                  <input type="number" min={0} value={f.v} onChange={(e) => f.set(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-3 text-text-primary text-sm num focus:outline-none focus:border-lime/50 pr-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Activity Level</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityKey)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-lime/50">
              {ACTIVITY_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label} · {a.desc}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button key={g.key} onClick={() => setGoal(g.key)}
                  className={`py-3 rounded-xl text-sm font-display font-bold uppercase tracking-wider transition-all ${goal === g.key ? "bg-lime text-canvas" : "bg-surface border border-border text-text-secondary hover:text-text-primary"}`}>
                  {g.label}
                </button>
              ))}
            </div>
            <p className="text-text-muted text-xs mt-2">{GOAL_OPTIONS.find((g) => g.key === goal)?.desc}</p>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <div className="bg-lime rounded-2xl p-6 text-canvas">
            <p className="text-canvas/70 text-xs font-mono uppercase tracking-[0.2em] mb-1">Daily Target</p>
            <p className="num font-display font-black text-6xl leading-none">{t.calories.toLocaleString()}<span className="text-2xl font-bold ml-1">kcal</span></p>
            <div className="flex gap-4 mt-3 text-xs font-mono">
              <span>BMR {t.bmr}</span><span>TDEE {t.tdee}</span>
              <span>{goal === "cut" ? "CUT −" : goal === "bulk" ? "BULK +" : "MAINTAIN"}{goal !== "maintain" ? Math.abs(t.calories - t.tdee) : ""}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {macros.map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-2xl p-4">
                <div className={`h-1 w-8 rounded-full mb-3 ${m.color}`} />
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`num font-display font-black text-2xl leading-none ${m.text}`}>{m.v}<span className="text-sm font-normal text-text-muted">g</span></p>
                <p className="text-text-muted text-[10px] mt-1">{m.kcal} kcal</p>
              </div>
            ))}
          </div>

          <button onClick={apply} disabled={saveState === "saving"}
            className="w-full bg-lime/15 border border-lime/40 text-lime font-display font-bold py-3.5 rounded-2xl uppercase tracking-wider hover:bg-lime/25 transition-all disabled:opacity-50">
            {saveState === "saving" ? "Applying…" : saveState === "saved" ? "✓ Applied to Profile" : "Apply to Profile"}
          </button>
          {saveState === "needs_migration" && (
            <p className="text-amber-app text-xs text-center">Run <span className="font-mono">db/feature-tables.sql</span> in Supabase to save targets to your profile. The calculator still works in the meantime.</p>
          )}
          {t.estimated && (
            <p className="text-text-muted text-xs text-center">Fill in your real stats in onboarding for a precise target.</p>
          )}
          <p className="text-text-muted text-[11px] text-center">Formula · Mifflin-St Jeor · macros split protein-first, 25% fat, remainder carbs.</p>
        </div>
      </div>
    </div>
  );
}
