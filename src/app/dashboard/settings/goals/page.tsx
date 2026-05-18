"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const GOALS = [
  { id: "muscle_gain", emoji: "💪", label: "Build Muscle", color: "amber" },
  { id: "fat_loss", emoji: "🔥", label: "Lose Fat", color: "orange" },
  { id: "maintain", emoji: "⚖️", label: "Maintain & Optimize", color: "cyan" },
  { id: "eat_healthier", emoji: "🥗", label: "Eat Healthier", color: "lime" },
  { id: "performance", emoji: "⚡", label: "Athletic Performance", color: "lime" },
  { id: "save_money", emoji: "💰", label: "Save Money on Food", color: "amber" },
  { id: "medical", emoji: "🩺", label: "Medical / Condition", color: "cyan" },
  { id: "general_wellness", emoji: "🌱", label: "General Wellness", color: "lime" },
];

const SELECTED_MAP: Record<string, string> = {
  lime: "border-lime/60 bg-lime/15", amber: "border-amber-app/60 bg-amber-app/15",
  cyan: "border-cyan-app/60 bg-cyan-app/15", orange: "border-orange-400/60 bg-orange-400/15",
};

const MEAL_OPTIONS = [
  { value: 3, label: "3", desc: "Light" }, { value: 5, label: "5", desc: "Standard" },
  { value: 7, label: "7", desc: "Daily" }, { value: 10, label: "10", desc: "Frequent" },
  { value: 14, label: "14", desc: "2×/day" }, { value: 21, label: "21", desc: "3×/day" },
];

export default function EditGoalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [mealsPerWeek, setMealsPerWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data } = await supabase.from("onboarding").select("goals, meals_per_week").eq("user_id", user.id).single();
      if (data) {
        setSelected(data.goals || []);
        setMealsPerWeek(data.meals_per_week || null);
      }
      setFetching(false);
    };
    load();
  }, []);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      goals: selected,
      meals_per_week: mealsPerWeek,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    setSaved(true);
    setLoading(false);
  };

  if (fetching) return <div className="px-6 py-8 text-text-muted text-sm">Loading...</div>;

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors mb-4 inline-block">← Settings</Link>
        <h1 className="font-display font-black text-3xl text-text-primary">Nutrition Goals</h1>
        <p className="text-text-secondary mt-1">Update your goals as your focus shifts.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOALS.map((goal) => {
            const isSelected = selected.includes(goal.id);
            return (
              <button key={goal.id} onClick={() => toggle(goal.id)}
                className={`text-left p-4 rounded-xl border transition-all ${isSelected ? SELECTED_MAP[goal.color] : "bg-surface border-border hover:border-border-bright"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{goal.emoji}</span>
                    <span className="font-display font-bold text-text-primary text-sm">{goal.label}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-lime flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display font-bold text-text-primary text-sm mb-1">Meals per week</h3>
          <p className="text-text-muted text-xs mb-4">Used to size your grocery list and AI suggestions.</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {MEAL_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setMealsPerWeek(opt.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${mealsPerWeek === opt.value ? "bg-lime/10 border-lime/40" : "bg-surface border-border hover:border-border-bright"}`}>
                <span className={`num font-display font-black text-xl leading-none ${mealsPerWeek === opt.value ? "text-lime" : "text-text-primary"}`}>{opt.label}</span>
                <span className="text-text-muted text-xs mt-1">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}
        {saved && <p className="text-lime text-sm bg-lime/10 border border-lime/20 rounded-lg px-4 py-2">Saved successfully.</p>}

        <button onClick={handleSave} disabled={selected.length === 0 || !mealsPerWeek || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />Saving...</> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
