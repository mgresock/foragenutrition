"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Tip {
  type: string;
  title: string;
  body: string;
}

interface Meal {
  name: string;
  desc: string;
  cost: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_time: string;
  ingredients: string[];
}

interface Suggestions {
  date_label: string;
  tips: Tip[];
  meals: Meal[];
}

const TIP_ICONS: Record<string, string> = {
  protein: "💪", calories: "🔥", timing: "⏰", budget: "💰", consistency: "📈", habit: "🎯", general: "⚡",
};

const MEAL_COLORS = ["bg-lime/5 border-lime/15", "bg-amber-app/5 border-amber-app/15", "bg-cyan-app/5 border-cyan-app/15", "bg-surface border-border"];
const MACRO_COLORS = ["text-lime", "text-amber-app", "text-cyan-app"];

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`num font-display font-bold text-base leading-none ${color}`}>{value}<span className="text-text-muted text-xs font-normal">{unit}</span></p>
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

export default function SuggestionsPage() {
  const supabase = createClient();
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [showInput, setShowInput] = useState(false);

  const CACHE_KEY = "forage_daily_suggestions";

  const load = useCallback(async (force = false, extra = "") => {
    setLoading(true);
    setError(false);

    if (!force && !extra) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts, date } = JSON.parse(cached);
        const today = new Date().toISOString().split("T")[0];
        if (date === today && Date.now() - ts < 24 * 60 * 60 * 1000) {
          setSuggestions(data);
          setLoading(false);
          return;
        }
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [{ data: logs }, { data: profile }] = await Promise.all([
      supabase.from("meal_logs").select("name, calories, protein_g, carbs_g, fat_g, logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", sevenDaysAgo.toISOString())
        .order("logged_at", { ascending: false }),
      supabase.from("profiles").select("goals, meals_per_week, weekly_budget, weight_kg").eq("id", user.id).single(),
    ]);

    const onboarding = await supabase.from("onboarding").select("goals").eq("user_id", user.id).single();

    const profileData = {
      ...profile,
      goals: onboarding.data?.goals ?? profile?.goals ?? [],
    };

    try {
      const res = await fetch("/api/daily-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logs ?? [], profile: profileData, extraContext: extra }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        ts: Date.now(),
        date: new Date().toISOString().split("T")[0],
      }));
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">Daily</p>
          <h1 className="font-display font-black text-3xl text-text-primary">Suggestions</h1>
          <p className="text-text-secondary mt-1 text-sm">Personalized tips and budget meal ideas, refreshed daily.</p>
        </div>
        {!loading && (
          <button
            onClick={() => load(true, extraContext)}
            className="flex-shrink-0 px-3 py-2 bg-card border border-border rounded-xl text-text-muted text-xs hover:text-text-secondary hover:border-border-bright transition-all"
          >
            Refresh ↺
          </button>
        )}
      </div>

      {/* Manual context input */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <button
          className="w-full flex items-center justify-between gap-2 text-left"
          onClick={() => setShowInput((v) => !v)}
        >
          <div>
            <p className="text-text-primary font-medium text-sm">Tell Forage what you've been eating</p>
            <p className="text-text-muted text-xs mt-0.5">Add context beyond your logged meals for more accurate suggestions</p>
          </div>
          <span className={`text-text-muted text-xs transition-transform flex-shrink-0 ${showInput ? "rotate-180" : ""}`}>▾</span>
        </button>
        {showInput && (
          <div className="mt-3 space-y-3">
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. I've been eating mostly fast food this week, skipping breakfast, and drinking a lot of soda. I usually have a protein shake after the gym but ran out."
              rows={3}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all resize-none leading-relaxed"
            />
            <button
              onClick={() => { setShowInput(false); load(true, extraContext); }}
              disabled={!extraContext.trim() || loading}
              className="w-full py-2.5 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all disabled:opacity-40"
            >
              Regenerate with this context
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-5 w-40 bg-surface rounded-lg animate-pulse mb-6" />
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />)}
          <div className="h-5 w-32 bg-surface rounded-lg animate-pulse mt-8 mb-4" />
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-400 text-sm mb-3">Couldn't load suggestions right now.</p>
          <button onClick={() => load(true)} className="text-red-400 text-xs hover:text-red-300 underline">Try again</button>
        </div>
      )}

      {suggestions && !loading && (
        <>
          {/* Tips section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-lime animate-pulse-slow" />
              <h2 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Today's Tips</h2>
            </div>
            <div className="space-y-3">
              {suggestions.tips.map((tip, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 flex gap-4">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{TIP_ICONS[tip.type] ?? "⚡"}</span>
                  <div>
                    <p className="text-text-primary font-medium text-sm mb-1">{tip.title}</p>
                    <p className="text-text-secondary text-xs leading-relaxed">{tip.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal ideas section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Budget Meal Ideas</h2>
              <span className="text-text-muted text-xs font-mono ml-auto">under $5 each</span>
            </div>
            <div className="space-y-3">
              {suggestions.meals.map((meal, i) => (
                <div
                  key={i}
                  className={`border rounded-2xl overflow-hidden transition-all ${MEAL_COLORS[i % MEAL_COLORS.length]}`}
                >
                  <button
                    className="w-full p-4 text-left"
                    onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-text-primary text-base leading-tight">{meal.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-lime/10 border border-lime/20 rounded-full text-lime text-xs font-mono">
                              ~${meal.cost.toFixed(2)}
                            </span>
                            <span className="text-text-muted text-xs">{meal.prep_time}</span>
                          </div>
                        </div>
                        <p className="text-text-secondary text-xs mt-1 leading-relaxed">{meal.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="num font-display font-bold text-xl text-text-primary leading-none">{meal.calories}</p>
                        <p className="text-text-muted text-xs">kcal</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {[
                        { label: "Protein", value: meal.protein_g, unit: "g", color: MACRO_COLORS[0] },
                        { label: "Carbs", value: meal.carbs_g, unit: "g", color: MACRO_COLORS[1] },
                        { label: "Fat", value: meal.fat_g, unit: "g", color: MACRO_COLORS[2] },
                      ].map((m) => (
                        <MacroPill key={m.label} {...m} />
                      ))}
                      <span className={`ml-auto text-text-muted text-xs transition-transform ${expandedMeal === i ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </button>

                  {expandedMeal === i && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <p className="text-text-muted text-xs uppercase tracking-wider mt-3 mb-2">Ingredients</p>
                      <ul className="space-y-1.5">
                        {meal.ingredients.map((ing, j) => (
                          <li key={j} className="flex items-center gap-2 text-text-secondary text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime/50 flex-shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-text-muted text-xs text-center mt-8">
            Refreshes daily · based on your logs and goals
          </p>
        </>
      )}
    </div>
  );
}
