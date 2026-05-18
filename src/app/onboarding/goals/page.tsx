"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

const GOALS = [
  { id: "muscle_gain", emoji: "💪", label: "Build Muscle", description: "Caloric surplus, high protein, progressive overload nutrition support", tags: ["Bulking", "Gym-focused", "High protein"], color: "amber" },
  { id: "fat_loss", emoji: "🔥", label: "Lose Fat", description: "Controlled deficit, preserve lean mass, sustainable approach", tags: ["Cutting", "Deficit", "Body recomp"], color: "orange" },
  { id: "maintain", emoji: "⚖️", label: "Maintain & Optimize", description: "Eat at maintenance, improve food quality, feel consistently energized", tags: ["Maintenance", "Clean eating"], color: "cyan" },
  { id: "eat_healthier", emoji: "🥗", label: "Eat Healthier", description: "Better whole foods, less processed junk, improved daily nutrition", tags: ["Whole foods", "Anti-inflammatory"], color: "lime" },
  { id: "performance", emoji: "⚡", label: "Athletic Performance", description: "Fuel training, optimize recovery, sport-specific macros", tags: ["Performance", "Recovery", "Pre/post workout"], color: "lime" },
  { id: "save_money", emoji: "💰", label: "Save Money on Food", description: "Eat well on a tight budget — maximize nutrition per dollar", tags: ["Budget", "Meal prep", "Value"], color: "amber" },
  { id: "medical", emoji: "🩺", label: "Medical / Condition", description: "Manage specific conditions (diabetes, heart health, food allergies)", tags: ["Health condition", "Doctor-guided"], color: "cyan" },
  { id: "general_wellness", emoji: "🌱", label: "General Wellness", description: "Just want to feel better and build sustainable healthy habits", tags: ["Lifestyle", "Habits"], color: "lime" },
];

const SELECTED_MAP: Record<string, string> = { lime: "border-lime/60 bg-lime/15 shadow-lime-sm", amber: "border-amber-app/60 bg-amber-app/15", cyan: "border-cyan-app/60 bg-cyan-app/15", orange: "border-orange-400/60 bg-orange-400/15" };
const TAG_MAP: Record<string, string> = { lime: "bg-lime/10 text-lime", amber: "bg-amber-app/10 text-amber-app", cyan: "bg-cyan-app/10 text-cyan-app", orange: "bg-orange-400/10 text-orange-400" };

const MEAL_OPTIONS = [
  { value: 3, label: "3", desc: "Light" },
  { value: 5, label: "5", desc: "Standard" },
  { value: 7, label: "7", desc: "Daily" },
  { value: 10, label: "10", desc: "Frequent" },
  { value: 14, label: "14", desc: "2×/day" },
  { value: 21, label: "21", desc: "3×/day" },
];

export default function GoalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [mealsPerWeek, setMealsPerWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const handleFinish = async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      goals: selected,
      meals_per_week: mealsPerWeek,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  };

  const canContinue = selected.length > 0 && mealsPerWeek !== null;

  return (
    <OnboardingShell step={4} totalSteps={4} title="What's driving you?" subtitle="Select all that apply. We'll tailor your macros, grocery picks, and AI suggestions to match.">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOALS.map((goal) => {
            const isSelected = selected.includes(goal.id);
            return (
              <button key={goal.id} onClick={() => toggle(goal.id)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${isSelected ? SELECTED_MAP[goal.color] : "bg-surface border-border hover:border-border-bright"}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{goal.emoji}</span>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-lime flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                </div>
                <h3 className="font-display font-bold text-text-primary text-sm mb-1">{goal.label}</h3>
                <p className="text-text-muted text-xs leading-relaxed mb-3">{goal.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {goal.tags.map((tag) => <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${TAG_MAP[goal.color]}`}>{tag}</span>)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="mb-4">
            <h3 className="font-display font-bold text-text-primary text-sm">How many meals per week do you want to plan?</h3>
            <p className="text-text-muted text-xs mt-1">We'll size your grocery list and AI suggestions around this.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {MEAL_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setMealsPerWeek(opt.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${mealsPerWeek === opt.value ? "bg-lime/10 border-lime/40 shadow-lime-sm" : "bg-surface border-border hover:border-border-bright"}`}>
                <span className={`num font-display font-black text-xl leading-none ${mealsPerWeek === opt.value ? "text-lime" : "text-text-primary"}`}>{opt.label}</span>
                <span className="text-text-muted text-xs mt-1">{opt.desc}</span>
              </button>
            ))}
          </div>
          {mealsPerWeek !== null && (
            <p className="text-text-secondary text-xs mt-3 animate-fade-in">
              {mealsPerWeek} meals/week ≈ <span className="text-lime font-medium">{Math.round(mealsPerWeek / 7 * 10) / 10} meals/day</span>
              {mealsPerWeek >= 14 && " — we'll split your calories across multiple meals for better energy and recovery."}
              {mealsPerWeek < 14 && mealsPerWeek >= 7 && " — solid rhythm for consistent nutrition."}
              {mealsPerWeek < 7 && " — we'll make sure each meal is nutritionally complete."}
            </p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleFinish} disabled={!canContinue || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />Saving...</>
            : !selected.length ? "Select at least one goal"
            : !mealsPerWeek ? "Choose how many meals per week"
            : `Let's Go — ${selected.length} goal${selected.length > 1 ? "s" : ""} · ${mealsPerWeek} meals/wk`}
        </button>
      </div>
    </OnboardingShell>
  );
}
