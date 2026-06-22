"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { FoodSearchTab, type FoodLogEntry } from "@/components/calories/FoodSearchTab";
import { computeTargets, goalFromGoals } from "@/lib/nutrition";
import Link from "next/link";

// Share of the daily calorie target per time-of-day slot (meal-time targets).
const SLOT_FRACTION: Record<string, number> = { Morning: 0.30, Afternoon: 0.35, Evening: 0.30, Night: 0.05 };

// datetime-local <input> value (local time) from a Date
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// A single part of a crafted meal — stored inside nutrition_meta.components so
// the full per-ingredient breakdown can be viewed again later.
interface MealComponent {
  name: string;
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  sodium_mg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_b12_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  magnesium_mg?: number;
}

interface NutritionMeta {
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  sodium_mg?: number;
  protein_quality?: "complete" | "incomplete" | "mixed";
  carb_type?: "simple" | "complex" | "mixed";
  notes?: string;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_b12_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  magnesium_mg?: number;
  components?: MealComponent[];
}
interface MealLog { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; logged_at: string; source: string; nutrition_meta?: NutritionMeta; }

const MICRO_KEYS = [
  "fiber_g", "sugar_g", "saturated_fat_g", "sodium_mg",
  "vitamin_c_mg", "vitamin_d_mcg", "vitamin_b12_mcg",
  "calcium_mg", "iron_mg", "potassium_mg", "magnesium_mg",
] as const;

// Sum every macro + micro field across the parts of a crafted meal.
function aggregateComponents(comps: MealComponent[]) {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const meta: NutritionMeta = { components: comps, protein_quality: "mixed", carb_type: "mixed" };
  for (const key of MICRO_KEYS) {
    const total = comps.reduce((s, c) => s + (Number(c[key]) || 0), 0);
    if (total > 0) (meta as Record<string, unknown>)[key] = round1(total);
  }
  return {
    calories: Math.round(comps.reduce((s, c) => s + (c.calories || 0), 0)),
    protein_g: round1(comps.reduce((s, c) => s + (c.protein_g || 0), 0)),
    carbs_g: round1(comps.reduce((s, c) => s + (c.carbs_g || 0), 0)),
    fat_g: round1(comps.reduce((s, c) => s + (c.fat_g || 0), 0)),
    nutrition_meta: meta,
  };
}

function groupByTime(logs: MealLog[]) {
  const groups = [
    { label: "Morning", emoji: "🌅", min: 5, max: 11, entries: [] as MealLog[] },
    { label: "Afternoon", emoji: "☀️", min: 11, max: 17, entries: [] as MealLog[] },
    { label: "Evening", emoji: "🌙", min: 17, max: 22, entries: [] as MealLog[] },
    { label: "Night", emoji: "🌃", min: 22, max: 29, entries: [] as MealLog[] },
  ];
  logs.forEach((log) => {
    const h = new Date(log.logged_at).getHours();
    const adjusted = h < 5 ? h + 24 : h;
    const group = groups.find((g) => adjusted >= g.min && adjusted < g.max) || groups[3];
    group.entries.push(log);
  });
  return groups.filter((g) => g.entries.length > 0);
}

function MacroRing({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return <div className="w-32 h-32 rounded-full border-4 border-border" />;

  const pCal = (protein * 4 / total) * 100;
  const cCal = (carbs * 4 / total) * 100;
  const fCal = (fat * 9 / total) * 100;

  // SVG donut: circumference = 2π*40 ≈ 251.2
  const C = 251.2;
  const pLen = (pCal / 100) * C;
  const cLen = (cCal / 100) * C;
  const fLen = (fCal / 100) * C;
  const gap = 2;

  return (
    <svg width="128" height="128" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1f12" strokeWidth="12" />
      {/* protein - lime */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#34C759" strokeWidth="12"
        strokeDasharray={`${Math.max(0, pLen - gap)} ${C - Math.max(0, pLen - gap)}`}
        strokeDashoffset="0" strokeLinecap="round" />
      {/* carbs - amber */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#FF9F0A" strokeWidth="12"
        strokeDasharray={`${Math.max(0, cLen - gap)} ${C - Math.max(0, cLen - gap)}`}
        strokeDashoffset={`${-(pLen)}`} strokeLinecap="round" />
      {/* fat - cyan */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#32ADE6" strokeWidth="12"
        strokeDasharray={`${Math.max(0, fLen - gap)} ${C - Math.max(0, fLen - gap)}`}
        strokeDashoffset={`${-(pLen + cLen)}`} strokeLinecap="round" />
    </svg>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EntryDetailModal({ entry, onClose, onDelete, onUpdate }: { entry: MealLog; onClose: () => void; onDelete: (id: string) => void; onUpdate: (id: string, patch: Partial<MealLog> & { logged_at?: string }) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState(entry.name);
  const [eCals, setECals] = useState(String(entry.calories));
  const [eProtein, setEProtein] = useState(String(entry.protein_g));
  const [eCarbs, setECarbs] = useState(String(entry.carbs_g));
  const [eFat, setEFat] = useState(String(entry.fat_g));
  const [eWhen, setEWhen] = useState(toLocalInput(new Date(entry.logged_at)));
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = () => {
    setEName(entry.name); setECals(String(entry.calories)); setEProtein(String(entry.protein_g));
    setECarbs(String(entry.carbs_g)); setEFat(String(entry.fat_g)); setEWhen(toLocalInput(new Date(entry.logged_at)));
    setEditing(true);
  };
  const saveEdit = async () => {
    setSavingEdit(true);
    const d = new Date(eWhen);
    await onUpdate(entry.id, {
      name: eName.trim() || entry.name,
      calories: Math.round(Number(eCals) || 0),
      protein_g: Number(eProtein) || 0,
      carbs_g: Number(eCarbs) || 0,
      fat_g: Number(eFat) || 0,
      logged_at: isNaN(d.getTime()) ? entry.logged_at : d.toISOString(),
    });
    setSavingEdit(false);
    setEditing(false);
  };

  const meta = entry.nutrition_meta ?? {};
  const totalMacroCals = entry.protein_g * 4 + entry.carbs_g * 4 + entry.fat_g * 9;
  const pct = (val: number, mult: number) => totalMacroCals > 0 ? Math.round((val * mult / totalMacroCals) * 100) : 0;

  // Smart estimates for old entries without meta
  const fiber = meta.fiber_g ?? Math.round(entry.carbs_g * 0.08);
  const sugar = meta.sugar_g ?? Math.round(entry.carbs_g * 0.22);
  const satFat = meta.saturated_fat_g ?? Math.round(entry.fat_g * 0.35);
  const unsatFat = Math.max(0, entry.fat_g - satFat);
  const proteinQuality = meta.protein_quality ?? "mixed";
  const carbType = meta.carb_type ?? "mixed";

  const proteinQualityLabel: Record<string, { label: string; desc: string; color: string }> = {
    complete: { label: "Complete", desc: "All 9 essential amino acids", color: "bg-lime/10 text-lime border-lime/20" },
    incomplete: { label: "Incomplete", desc: "Pair with complementary proteins", color: "bg-amber-app/10 text-amber-app border-amber-app/20" },
    mixed: { label: "Mixed", desc: "Blend of protein sources", color: "bg-text-muted/10 text-text-secondary border-border" },
  };
  const carbTypeLabel: Record<string, { label: string; desc: string; color: string }> = {
    complex: { label: "Complex", desc: "Slow-release · sustained energy", color: "bg-lime/10 text-lime border-lime/20" },
    simple: { label: "Simple", desc: "Fast-absorbing · good post-workout", color: "bg-amber-app/10 text-amber-app border-amber-app/20" },
    mixed: { label: "Mixed", desc: "Fast and slow-release blend", color: "bg-text-muted/10 text-text-secondary border-border" },
  };

  const pq = proteinQualityLabel[proteinQuality];
  const ct = carbTypeLabel[carbType];

  const dominant = entry.protein_g >= entry.carbs_g && entry.protein_g >= entry.fat_g
    ? "protein-dominant" : entry.carbs_g >= entry.fat_g ? "carb-dominant" : "fat-dominant";
  const domColor = dominant === "protein-dominant" ? "text-lime" : dominant === "carb-dominant" ? "text-amber-app" : "text-cyan-app";

  const insightTags: { text: string; color: string }[] = [];
  if (entry.protein_g >= 20) insightTags.push({ text: "great for muscle", color: "text-lime" });
  if (proteinQuality === "complete" && entry.protein_g >= 15) insightTags.push({ text: "complete protein", color: "text-lime" });
  if (carbType === "complex") insightTags.push({ text: "slow-release carbs", color: "text-amber-app" });
  if (fiber >= 4) insightTags.push({ text: "high fiber", color: "text-amber-app" });
  if (unsatFat > satFat * 1.5) insightTags.push({ text: "heart-healthy fats", color: "text-cyan-app" });
  if (entry.calories < 300) insightTags.push({ text: "light meal", color: "text-text-muted" });
  if (entry.calories > 700) insightTags.push({ text: "high calorie", color: "text-text-muted" });

  const roles: { icon: string; title: string; desc: string; color: string }[] = [];
  if (entry.protein_g >= 20) {
    roles.push(proteinQuality === "complete"
      ? { icon: "💪", title: "Muscle Protein Synthesis", desc: `${entry.protein_g}g complete protein — all essential amino acids trigger muscle repair and growth.`, color: "text-lime" }
      : { icon: "💪", title: "Muscle Support", desc: `${entry.protein_g}g protein toward your daily target. Pair with a complete source for full amino acid coverage.`, color: "text-lime" });
  } else if (entry.protein_g >= 10) {
    roles.push({ icon: "💪", title: "Protein Contribution", desc: `${entry.protein_g}g — partial contribution toward your daily muscle-building target.`, color: "text-lime" });
  }
  if (entry.carbs_g >= 20) {
    const carbDescs: Record<string, { title: string; desc: string }> = {
      complex: { title: "Sustained Energy", desc: `${entry.carbs_g}g slow-release carbs fuel workouts and replenish muscle glycogen steadily.` },
      simple: { title: "Rapid Glycogen Refuel", desc: `${entry.carbs_g}g fast carbs — ideal 30–60 min post-workout to spike insulin and restore glycogen.` },
      mixed: { title: "Mixed Energy", desc: `${entry.carbs_g}g blend of fast and slow carbs — initial boost with sustained follow-through.` },
    };
    const c = carbDescs[carbType] ?? carbDescs.mixed;
    roles.push({ icon: "⚡", title: c.title, desc: c.desc, color: "text-amber-app" });
  }
  if (fiber >= 5) {
    roles.push({ icon: "🌾", title: "Gut & Blood Sugar", desc: `${fiber}g fiber slows digestion, stabilizes blood sugar, and feeds beneficial gut bacteria.`, color: "text-text-secondary" });
  }
  if (entry.fat_g >= 8) {
    roles.push(unsatFat >= satFat
      ? { icon: "🫀", title: "Hormone & Recovery Support", desc: `${entry.fat_g}g healthy fats support testosterone and absorption of vitamins A, D, E, and K.`, color: "text-cyan-app" }
      : { icon: "🔥", title: "Dense Energy", desc: `${entry.fat_g}g fat — high-calorie fuel. Saturated fat is elevated; balance with unsaturated sources over the day.`, color: "text-cyan-app" });
  }
  if (meta.sodium_mg && meta.sodium_mg > 800) {
    roles.push({ icon: "💧", title: "Electrolyte Replenishment", desc: `${meta.sodium_mg}mg sodium helps replace electrolytes lost during training. Stay hydrated.`, color: "text-text-secondary" });
  }

  const sourceLabel: Record<string, string> = {
    ai_photo: "Photo", ai_describe: "Described", ai_brand: "Brand", manual: "Manual",
  };

  if (editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full lg:max-w-md bg-surface border border-border rounded-t-3xl lg:rounded-3xl p-6 pb-8 lg:pb-6 z-10 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 lg:hidden" />
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl text-text-primary uppercase tracking-tight">Edit Entry</h2>
            <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary text-sm">✕</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">Name</label>
              <input aria-label="entry-name" value={eName} onChange={(e) => setEName(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-lime/50" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Cals", v: eCals, set: setECals },
                { label: "Protein", v: eProtein, set: setEProtein },
                { label: "Carbs", v: eCarbs, set: setECarbs },
                { label: "Fat", v: eFat, set: setEFat },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[10px] text-text-muted mb-1">{f.label}</label>
                  <input type="number" min={0} value={f.v} onChange={(e) => f.set(e.target.value)} className="w-full bg-card border border-border rounded-xl px-2.5 py-2 text-text-primary text-sm num focus:outline-none focus:border-lime/50" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">When</label>
              <input type="datetime-local" value={eWhen} max={toLocalInput(new Date())} onChange={(e) => setEWhen(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-lime/50" />
            </div>
            {meta.components && meta.components.length > 0 && (
              <p className="text-text-muted text-xs">Note: editing the totals here won't recompute the per-part breakdown.</p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 bg-lime text-canvas font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all disabled:opacity-50">{savingEdit ? "Saving…" : "Save Changes"}</button>
              <button onClick={() => setEditing(false)} className="px-5 py-3 bg-card border border-border rounded-xl text-sm text-text-secondary hover:border-border-bright transition-all">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full lg:max-w-md bg-surface border border-border rounded-t-3xl lg:rounded-3xl p-6 pb-8 lg:pb-6 z-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 lg:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-bold text-xl text-text-primary leading-tight">{entry.name}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-text-muted text-xs">
                {new Date(entry.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(entry.logged_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-card border border-border text-text-muted">
                {sourceLabel[entry.source] ?? entry.source}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={startEdit} title="Edit" className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-lime transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20"><path d="M13.5 3.5l3 3L7 16l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-sm">✕</button>
          </div>
        </div>

        {/* Calorie overview */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 mb-3">
          <div className="flex-shrink-0">
            <MacroRing protein={entry.protein_g} carbs={entry.carbs_g} fat={entry.fat_g} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="num font-display font-black text-4xl text-text-primary leading-none">{entry.calories}</div>
            <div className="text-text-muted text-xs mt-0.5 mb-3">total calories</div>
            <div className="space-y-1.5">
              {[
                { label: "Protein", color: "bg-lime", textColor: "text-lime", val: entry.protein_g, mult: 4 },
                { label: "Carbs", color: "bg-amber-app", textColor: "text-amber-app", val: entry.carbs_g, mult: 4 },
                { label: "Fat", color: "bg-cyan-app", textColor: "text-cyan-app", val: entry.fat_g, mult: 9 },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.color}`} />
                  <span className="text-text-muted text-xs w-12">{m.label}</span>
                  <MiniBar value={m.val * m.mult} max={totalMacroCals} color={m.color} />
                  <span className={`text-xs font-display font-semibold ${m.textColor} w-7 text-right`}>{pct(m.val, m.mult)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meal components (crafted meals) */}
        {meta.components && meta.components.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted uppercase tracking-wider">Meal Parts · {meta.components.length}</p>
              <p className="text-text-muted text-[10px]">protein shown per part</p>
            </div>
            <div className="space-y-2.5">
              {meta.components.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ITEM_COLORS[i % ITEM_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate leading-tight">{c.name}</p>
                    {c.amount && <p className="text-text-muted text-[10px] leading-tight">{c.amount}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.protein_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-lime/10 text-lime font-mono border border-lime/20">{Math.round(c.protein_g)}P</span>}
                    {c.carbs_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-app/10 text-amber-app font-mono border border-amber-app/20">{Math.round(c.carbs_g)}C</span>}
                    {c.fat_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-app/10 text-cyan-app font-mono border border-cyan-app/20">{Math.round(c.fat_g)}F</span>}
                    <span className="num font-display font-bold text-text-primary text-sm w-12 text-right">{Math.round(c.calories)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protein breakdown */}
        <div className="bg-lime/5 border border-lime/15 rounded-2xl p-4 mb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Protein</div>
              <div className="flex items-baseline gap-2">
                <span className="num font-display font-black text-3xl text-lime leading-none">{entry.protein_g}<span className="text-base font-normal text-text-muted ml-0.5">g</span></span>
                <span className="text-text-muted text-xs">{entry.protein_g * 4} kcal</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${pq.color}`}>{pq.label}</span>
          </div>
          <p className="text-text-muted text-xs mb-3">{pq.desc}</p>
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs w-20">of calories</span>
            <MiniBar value={entry.protein_g * 4} max={totalMacroCals} color="bg-lime" />
            <span className="text-lime text-xs font-display font-semibold w-7 text-right">{pct(entry.protein_g, 4)}%</span>
          </div>
        </div>

        {/* Carbs breakdown */}
        <div className="bg-amber-app/5 border border-amber-app/15 rounded-2xl p-4 mb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Carbohydrates</div>
              <div className="flex items-baseline gap-2">
                <span className="num font-display font-black text-3xl text-amber-app leading-none">{entry.carbs_g}<span className="text-base font-normal text-text-muted ml-0.5">g</span></span>
                <span className="text-text-muted text-xs">{entry.carbs_g * 4} kcal</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${ct.color}`}>{ct.label}</span>
          </div>
          <p className="text-text-muted text-xs mb-3">{ct.desc}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs w-10">Fiber</span>
              <MiniBar value={fiber} max={entry.carbs_g} color="bg-lime" />
              <span className="text-lime text-xs font-display font-semibold w-8 text-right">{fiber}g</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs w-10">Sugar</span>
              <MiniBar value={sugar} max={entry.carbs_g} color="bg-amber-app" />
              <span className="text-amber-app text-xs font-display font-semibold w-8 text-right">{sugar}g</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs w-10">Other</span>
              <MiniBar value={Math.max(0, entry.carbs_g - fiber - sugar)} max={entry.carbs_g} color="bg-text-muted/40" />
              <span className="text-text-muted text-xs font-display w-8 text-right">{Math.max(0, entry.carbs_g - fiber - sugar)}g</span>
            </div>
          </div>
        </div>

        {/* Fat breakdown */}
        <div className="bg-cyan-app/5 border border-cyan-app/15 rounded-2xl p-4 mb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Fat</div>
              <div className="flex items-baseline gap-2">
                <span className="num font-display font-black text-3xl text-cyan-app leading-none">{entry.fat_g}<span className="text-base font-normal text-text-muted ml-0.5">g</span></span>
                <span className="text-text-muted text-xs">{entry.fat_g * 9} kcal</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${unsatFat >= satFat ? "bg-lime/10 text-lime border-lime/20" : "bg-amber-app/10 text-amber-app border-amber-app/20"}`}>
              {unsatFat >= satFat ? "Mostly Unsaturated" : "Mostly Saturated"}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs w-16">Saturated</span>
              <MiniBar value={satFat} max={entry.fat_g} color="bg-amber-app" />
              <span className="text-amber-app text-xs font-display font-semibold w-8 text-right">{satFat}g</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs w-16">Unsaturated</span>
              <MiniBar value={unsatFat} max={entry.fat_g} color="bg-cyan-app" />
              <span className="text-cyan-app text-xs font-display font-semibold w-8 text-right">{unsatFat}g</span>
            </div>
          </div>
        </div>

        {/* What this produces */}
        {roles.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-3">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">What this produces</p>
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.title} className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{role.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold mb-0.5 ${role.color}`}>{role.title}</p>
                    <p className="text-text-muted text-xs leading-snug">{role.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sodium */}
        {meta.sodium_mg != null && (
          <div className="bg-card border border-border rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Sodium</div>
              <div className="flex items-baseline gap-1.5">
                <span className="num font-display font-bold text-xl text-text-primary leading-none">{meta.sodium_mg}</span>
                <span className="text-text-muted text-xs">mg</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-xs font-medium ${
              meta.sodium_mg > 1500 ? "bg-red-500/10 text-red-400 border-red-500/20"
              : meta.sodium_mg > 800 ? "bg-amber-app/10 text-amber-app border-amber-app/20"
              : "bg-lime/10 text-lime border-lime/20"
            }`}>
              {meta.sodium_mg > 1500 ? "High" : meta.sodium_mg > 800 ? "Moderate" : "Low"}
            </span>
          </div>
        )}

        {/* AI notes */}
        {meta.notes && (
          <div className="bg-card border border-border rounded-xl px-4 py-3 mb-3">
            <p className="text-text-muted text-xs leading-relaxed italic">"{meta.notes}"</p>
          </div>
        )}

        {/* Insight line */}
        <div className="flex items-start gap-2 bg-card border border-border rounded-xl px-4 py-3 mb-5">
          <span className="text-sm mt-0.5">💡</span>
          <span className="text-text-secondary text-sm leading-relaxed">
            This meal is{" "}
            <span className={`font-semibold ${domColor}`}>{dominant}</span>
            {insightTags.map((tag, i) => (
              <span key={i} className={tag.color}> · {tag.text}</span>
            ))}
          </span>
        </div>

        <button
          onClick={() => { onDelete(entry.id); onClose(); }}
          className="w-full py-3 rounded-xl border border-red-400/20 text-red-400 text-sm hover:bg-red-400/10 transition-all">
          Remove from Log
        </button>
      </div>
    </div>
  );
}

const ITEM_COLORS = ["#34C759", "#32ADE6", "#FF9F0A", "#a78bfa", "#f472b6", "#34d399", "#fb923c"];

interface MealGroup { label: string; emoji: string; entries: MealLog[]; }

function MealGroupModal({ group, onClose, onSelectEntry }: { group: MealGroup; onClose: () => void; onSelectEntry: (e: MealLog) => void }) {
  const totalCals = group.entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = group.entries.reduce((s, e) => s + e.protein_g, 0);
  const totalCarbs = group.entries.reduce((s, e) => s + e.carbs_g, 0);
  const totalFat = group.entries.reduce((s, e) => s + e.fat_g, 0);
  const totalSodium = group.entries.reduce((s, e) => s + (e.nutrition_meta?.sodium_mg ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full lg:max-w-md bg-surface border border-border rounded-t-3xl lg:rounded-3xl p-6 pb-8 lg:pb-6 z-10 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 lg:hidden" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{group.emoji}</span>
              <h2 className="font-display font-bold text-xl text-text-primary">{group.label}</h2>
            </div>
            <p className="text-text-muted text-xs mt-1">{group.entries.length} item{group.entries.length !== 1 ? "s" : ""} · tap any to see full detail</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary text-sm flex-shrink-0">✕</button>
        </div>

        {/* Meal totals */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-3">Meal Total</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Calories", value: totalCals, unit: "kcal", color: "text-text-primary" },
              { label: "Protein", value: Math.round(totalProtein), unit: "g", color: "text-lime" },
              { label: "Carbs", value: Math.round(totalCarbs), unit: "g", color: "text-amber-app" },
              { label: "Fat", value: Math.round(totalFat), unit: "g", color: "text-cyan-app" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`num font-display font-bold text-lg leading-none ${s.color}`}>{s.value}</p>
                <p className="text-text-muted text-xs mt-0.5">{s.unit}</p>
                <p className="text-text-muted text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
          {totalSodium > 0 && (
            <p className="text-text-muted text-xs text-center mt-1">{totalSodium}mg sodium total</p>
          )}
          {/* Calorie share bar */}
          {totalCals > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-px mt-3">
              {group.entries.map((e, i) => (
                <div key={e.id} style={{ width: `${(e.calories / totalCals) * 100}%`, background: ITEM_COLORS[i % ITEM_COLORS.length] }} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {group.entries.map((e, i) => (
              <div key={e.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ITEM_COLORS[i % ITEM_COLORS.length] }} />
                <span className="text-text-muted text-[10px] truncate max-w-[100px]">{e.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-item breakdown */}
        <p className="text-text-muted text-xs uppercase tracking-wider mb-3">Item Breakdown</p>
        <div className="space-y-3">
          {group.entries.map((entry, i) => {
            const calPct = totalCals > 0 ? Math.round((entry.calories / totalCals) * 100) : 0;
            const sodium = entry.nutrition_meta?.sodium_mg;
            return (
              <button
                key={entry.id}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-border-bright transition-all"
                onClick={() => { onClose(); onSelectEntry(entry); }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ITEM_COLORS[i % ITEM_COLORS.length] }} />
                    <p className="text-text-primary text-sm font-medium leading-snug">{entry.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="num font-display font-bold text-text-primary text-base leading-none">{entry.calories}</p>
                    <p className="text-text-muted text-[10px]">{calPct}% of meal</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Protein", val: entry.protein_g, total: totalProtein, color: "bg-lime", textColor: "text-lime", unit: "g" },
                    { label: "Carbs", val: entry.carbs_g, total: totalCarbs, color: "bg-amber-app", textColor: "text-amber-app", unit: "g" },
                    { label: "Fat", val: entry.fat_g, total: totalFat, color: "bg-cyan-app", textColor: "text-cyan-app", unit: "g" },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-2">
                      <span className="text-text-muted text-[10px] w-10 flex-shrink-0">{m.label}</span>
                      <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.total > 0 ? Math.round((m.val / m.total) * 100) : 0}%` }} />
                      </div>
                      <span className={`text-[10px] font-mono font-semibold ${m.textColor} w-8 text-right flex-shrink-0`}>{m.val}{m.unit}</span>
                    </div>
                  ))}
                  {sodium ? (
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-[10px] w-10 flex-shrink-0">Sodium</span>
                      <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-text-secondary/40" style={{ width: `${Math.min(100, totalSodium > 0 ? Math.round((sodium / totalSodium) * 100) : 0)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-text-secondary w-8 text-right flex-shrink-0">{sodium}mg</span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Tab = "log" | "search" | "camera" | "describe" | "brand" | "build" | "manual";

export default function CaloriesPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Omit<MealLog, "id" | "logged_at" | "source"> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualCals, setManualCals] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MealLog | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MealGroup | null>(null);
  const [describeText, setDescribeText] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [describeSource, setDescribeSource] = useState<"ai_photo" | "ai_describe" | "ai_brand">("ai_photo");
  // Meal builder state
  const [mealName, setMealName] = useState("");
  const [components, setComponents] = useState<MealComponent[]>([]);
  const [compName, setCompName] = useState("");
  const [compAmount, setCompAmount] = useState("");
  const [compCals, setCompCals] = useState("");
  const [compProtein, setCompProtein] = useState("");
  const [compCarbs, setCompCarbs] = useState("");
  const [compFat, setCompFat] = useState("");
  const [compMeta, setCompMeta] = useState<Partial<MealComponent> | null>(null);
  const [compEstimating, setCompEstimating] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [userEmail, setUserEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  // Backdated logging: the timestamp new entries are saved with (defaults to the
  // selected day at the current time so logging a missed meal "lands" correctly).
  const [logAt, setLogAt] = useState<string>(() => toLocalInput(new Date()));
  const [lastDeleted, setLastDeleted] = useState<MealLog | null>(null);
  const [recents, setRecents] = useState<MealLog[]>([]);
  const [templates, setTemplates] = useState<MealLog[]>([]);
  const [calorieTarget, setCalorieTarget] = useState(2600);
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = selectedDate.getTime() === today.getTime();

  const formatDate = (d: Date) => {
    if (d.getTime() === today.getTime()) return "Today";
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const goToPrevDay = () => { setActiveTab("log"); setSelectedDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p; }); };
  const goToNextDay = () => { if (!isToday) { setActiveTab("log"); setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }); } };

  const aiResultFromData = (data: Record<string, unknown>) => ({
    name: data.name as string,
    calories: data.calories as number,
    protein_g: data.protein as number,
    carbs_g: data.carbs as number,
    fat_g: data.fat as number,
    nutrition_meta: {
      fiber_g: data.fiber as number | undefined,
      sugar_g: data.sugar as number | undefined,
      saturated_fat_g: data.saturated_fat as number | undefined,
      sodium_mg: data.sodium as number | undefined,
      protein_quality: data.protein_quality as NutritionMeta["protein_quality"],
      carb_type: data.carb_type as NutritionMeta["carb_type"],
      notes: data.notes as string | undefined,
      vitamin_c_mg: data.vitamin_c_mg as number | undefined,
      vitamin_d_mcg: data.vitamin_d_mcg as number | undefined,
      vitamin_b12_mcg: data.vitamin_b12_mcg as number | undefined,
      calcium_mg: data.calcium_mg as number | undefined,
      iron_mg: data.iron_mg as number | undefined,
      potassium_mg: data.potassium_mg as number | undefined,
      magnesium_mg: data.magnesium_mg as number | undefined,
      // Per-component breakdown the estimator itemized — shown as "Meal Parts".
      components: Array.isArray(data.components) ? (data.components as MealComponent[]) : undefined,
    },
  });

  const loadLogs = async (date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("meal_logs")
      .select("id, name, calories, protein_g, carbs_g, fat_g, logged_at, source, nutrition_meta")
      .eq("user_id", user.id)
      .gte("logged_at", dayStart.toISOString()).lte("logged_at", dayEnd.toISOString())
      .order("logged_at", { ascending: false }).limit(100);
    if (data) setLogs(data);
  };

  const initLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? "");
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
    setUserTier((profile?.subscription_tier as "free" | "pro") ?? "free");
    loadLogs(selectedDate);
    loadRecents(user.id);
    loadTemplates(user.id);
    // Personalized daily calorie target (for meal-time pacing).
    const { data: ob } = await supabase.from("onboarding").select("*").eq("user_id", user.id).single();
    const o = ob as Record<string, unknown> | null;
    if (o) {
      const t = computeTargets({ sex: o.sex as string, age: o.age as number, height_cm: o.height_cm as number, weight_kg: o.weight_kg as number, activity: o.activity_level as string, goal: goalFromGoals(o.goals) });
      setCalorieTarget((o.daily_calorie_target as number) || t.calories);
    }
  };

  // Distinct recently-logged foods for one-tap re-logging (last 21 days).
  const loadRecents = async (userId: string) => {
    const since = new Date(Date.now() - 21 * 86400000).toISOString();
    const { data } = await supabase.from("meal_logs")
      .select("name, calories, protein_g, carbs_g, fat_g, nutrition_meta")
      .eq("user_id", userId).gte("logged_at", since)
      .order("logged_at", { ascending: false }).limit(150);
    if (!data) return;
    const seen = new Set<string>();
    const out: MealLog[] = [];
    for (const r of data) {
      const key = r.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r as MealLog);
      if (out.length >= 12) break;
    }
    setRecents(out);
  };

  useEffect(() => { initLoad(); }, []);
  useEffect(() => {
    loadLogs(selectedDate);
    // Keep the "logging for" timestamp on the day being viewed, at the current time.
    const now = new Date();
    const d = new Date(selectedDate);
    d.setHours(now.getHours(), now.getMinutes(), 0, 0);
    setLogAt(toLocalInput(d));
  }, [selectedDate]);

  const totalCals = logs.reduce((s, m) => s + m.calories, 0);
  const totalProtein = logs.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = logs.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = logs.reduce((s, m) => s + m.fat_g, 0);

  // All logging methods are available on any selected day (backdated logging).
  const visibleTabs: { id: Tab; label: string }[] = [
    { id: "log", label: "Log" },
    { id: "search", label: "🔍 Search" },
    { id: "build", label: "🧩 Build" },
    { id: "camera", label: "📷 Photo" },
    { id: "describe", label: "✍️ Describe" },
    { id: "brand", label: "🏪 Brand" },
    { id: "manual", label: "Manual" },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    setDescribeSource("ai_photo");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze-food", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error || !data.calories) { setAiError("Couldn't analyze the photo — try the Describe tab instead."); }
      else { setAiResult(aiResultFromData(data)); }
    } catch { setAiError("Something went wrong. Please try again."); }
    setAnalyzing(false);
  };

  const handleDescribeAnalyze = async () => {
    if (!describeText.trim()) return;
    setAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    setDescribeSource("ai_describe");
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: describeText }),
      });
      const data = await res.json();
      if (data.error || !data.calories) { setAiError("Couldn't estimate — try describing the meal in more detail."); }
      else { setAiResult(aiResultFromData(data)); }
    } catch { setAiError("Something went wrong. Please try again."); }
    setAnalyzing(false);
  };

  const handleBrandAnalyze = async () => {
    if (!brandName.trim() && !productName.trim()) return;
    setAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    setDescribeSource("ai_brand");
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brandName, product: productName, serving: servingSize }),
      });
      const data = await res.json();
      if (data.error || !data.calories) { setAiError("Couldn't find that product — try being more specific."); }
      else { setAiResult(aiResultFromData(data)); }
    } catch { setAiError("Something went wrong. Please try again."); }
    setAnalyzing(false);
  };

  // ISO timestamp new entries are logged with (from the backdating picker).
  const loggedAtISO = () => {
    const d = new Date(logAt);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const saveToDb = async (entry: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; source: string; image_path?: string; nutrition_meta?: NutritionMeta }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from("meal_logs").insert({ user_id: user.id, logged_at: loggedAtISO(), ...entry });
    if (error) console.error("saveToDb error:", error);
    return !error;
  };

  // Log a food picked from the Open Food Facts search / barcode scan.
  const logFood = async (entry: FoodLogEntry) => {
    setSaving(true);
    const ok = await saveToDb(entry as unknown as Parameters<typeof saveToDb>[0]);
    if (ok) await switchToLog();
    else setSaving(false);
  };

  // Copy the previous day's meals onto the day being viewed (same times).
  const copyPreviousDay = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const prev = new Date(selectedDate); prev.setDate(prev.getDate() - 1);
    const ps = new Date(prev); ps.setHours(0, 0, 0, 0);
    const pe = new Date(prev); pe.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("meal_logs")
      .select("name, calories, protein_g, carbs_g, fat_g, source, nutrition_meta, logged_at")
      .eq("user_id", user.id).gte("logged_at", ps.toISOString()).lte("logged_at", pe.toISOString()).limit(100);
    if (!data || data.length === 0) return;
    setSaving(true);
    const rows = data.map((r) => {
      const t = new Date(r.logged_at);
      const nd = new Date(selectedDate); nd.setHours(t.getHours(), t.getMinutes(), 0, 0);
      return { user_id: user.id, name: r.name, calories: r.calories, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, source: r.source, nutrition_meta: r.nutrition_meta, logged_at: nd.toISOString() };
    });
    await supabase.from("meal_logs").insert(rows);
    setSaving(false);
    await loadLogs(selectedDate);
  };

  // One-tap re-log of a recently eaten food.
  const relogRecent = async (r: MealLog) => {
    setSaving(true);
    const ok = await saveToDb({
      name: r.name, calories: r.calories, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g,
      source: "manual", nutrition_meta: r.nutrition_meta,
    });
    if (ok) await switchToLog();
    else setSaving(false);
  };

  const switchToLog = async () => {
    await loadLogs(selectedDate);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(selectedDate); dayEnd.setHours(23,59,59,999);
    const { data } = await supabase.from("meal_logs").select("id").eq("user_id", user.id)
      .gte("logged_at", dayStart.toISOString()).lte("logged_at", dayEnd.toISOString())
      .order("logged_at", { ascending: false }).limit(1);
    if (data?.[0]) setSavedId(data[0].id);
    setSaving(false);
    setActiveTab("log");
    setTimeout(() => setSavedId(null), 2500);
  };

  const addAiResult = async () => {
    if (!aiResult) return;
    setSaving(true);
    let imagePath: string | undefined;

    if (imageFile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("food-photos").upload(path, imageFile);
        if (!error) imagePath = path;
      }
    }

    const ok = await saveToDb({ ...aiResult, source: describeSource, image_path: imagePath });
    if (ok) {
      setAiResult(null); setImagePreview(null); setImageFile(null);
      setDescribeText(""); setBrandName(""); setProductName(""); setServingSize("");
      await switchToLog();
    } else {
      setSaving(false);
    }
  };

  const addManualEntry = async () => {
    if (!manualName || !manualCals) return;
    setSaving(true);
    const ok = await saveToDb({ name: manualName, calories: Number(manualCals), protein_g: Number(manualProtein) || 0, carbs_g: Number(manualCarbs) || 0, fat_g: Number(manualFat) || 0, source: "manual" });
    if (ok) {
      setManualName(""); setManualCals(""); setManualProtein(""); setManualCarbs(""); setManualFat("");
      await switchToLog();
    } else {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    const entry = logs.find((e) => e.id === id);
    await supabase.from("meal_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((e) => e.id !== id));
    if (entry) {
      setLastDeleted(entry);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setLastDeleted(null), 6000);
    }
  };

  // Undo a delete by re-inserting the entry (a new id, same data).
  const undoDelete = async () => {
    if (!lastDeleted) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const e = lastDeleted;
    setLastDeleted(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    await supabase.from("meal_logs").insert({
      user_id: user.id, name: e.name, calories: e.calories, protein_g: e.protein_g,
      carbs_g: e.carbs_g, fat_g: e.fat_g, source: e.source, logged_at: e.logged_at, nutrition_meta: e.nutrition_meta,
    });
    await loadLogs(selectedDate);
  };

  // Edit an existing logged entry (name/macros/time). Reloads the day so a
  // changed timestamp moves the entry to the correct day.
  const updateEntry = async (id: string, patch: Partial<MealLog> & { logged_at?: string }) => {
    const { error } = await supabase.from("meal_logs").update(patch).eq("id", id);
    if (error) { console.error("updateEntry error:", error); return; }
    setSelectedEntry((prev) => (prev && prev.id === id ? ({ ...prev, ...patch } as MealLog) : prev));
    await loadLogs(selectedDate);
  };

  // ── Meal builder ──────────────────────────────────────────────────────────
  // Ask the AI to estimate macros + micros for one ingredient at a given amount.
  // Fills the macro inputs and stashes the micro detail for when it's added.
  const estimateComponent = async () => {
    if (!compName.trim()) return;
    setCompEstimating(true);
    setCompError(null);
    try {
      const description = `${compAmount.trim()} ${compName.trim()}`.trim();
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (res.status === 402) { setCompError("Monthly AI limit reached — add macros manually or upgrade to Pro."); return; }
      if (data.error || data.calories == null) { setCompError("Couldn't estimate that — try adding the amount, or enter macros manually."); return; }
      setCompCals(String(data.calories));
      setCompProtein(String(data.protein ?? ""));
      setCompCarbs(String(data.carbs ?? ""));
      setCompFat(String(data.fat ?? ""));
      setCompMeta({
        fiber_g: data.fiber, sugar_g: data.sugar, saturated_fat_g: data.saturated_fat, sodium_mg: data.sodium,
        vitamin_c_mg: data.vitamin_c_mg, vitamin_d_mcg: data.vitamin_d_mcg, vitamin_b12_mcg: data.vitamin_b12_mcg,
        calcium_mg: data.calcium_mg, iron_mg: data.iron_mg, potassium_mg: data.potassium_mg, magnesium_mg: data.magnesium_mg,
      });
    } catch { setCompError("Something went wrong. Please try again."); }
    finally { setCompEstimating(false); }
  };

  const addComponent = () => {
    if (!compName.trim() || !compCals) return;
    const comp: MealComponent = {
      name: compName.trim(),
      amount: compAmount.trim(),
      calories: Number(compCals) || 0,
      protein_g: Number(compProtein) || 0,
      carbs_g: Number(compCarbs) || 0,
      fat_g: Number(compFat) || 0,
      ...(compMeta ?? {}),
    };
    setComponents((prev) => [...prev, comp]);
    setCompName(""); setCompAmount(""); setCompCals(""); setCompProtein(""); setCompCarbs(""); setCompFat("");
    setCompMeta(null); setCompError(null);
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Reorder a crafted-meal part up/down.
  const moveComponent = (index: number, dir: -1 | 1) => {
    setComponents((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const saveMeal = async () => {
    if (components.length === 0) return;
    setSaving(true);
    const agg = aggregateComponents(components);
    const name = mealName.trim() || (components.length === 1 ? components[0].name : `${components[0].name} + ${components.length - 1} more`);
    const ok = await saveToDb({ name, ...agg, source: "manual" });
    if (ok) {
      setComponents([]); setMealName("");
      setCompName(""); setCompAmount(""); setCompCals(""); setCompProtein(""); setCompCarbs(""); setCompFat(""); setCompMeta(null);
      await switchToLog();
    } else {
      setSaving(false);
    }
  };

  // Saved meal templates (reusable crafted meals). Graceful if table absent.
  const loadTemplates = async (userId: string) => {
    const { data } = await supabase.from("meal_templates")
      .select("id, name, calories, protein_g, carbs_g, fat_g, nutrition_meta")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (data) setTemplates(data as MealLog[]);
  };
  const saveTemplate = async () => {
    if (components.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const agg = aggregateComponents(components);
    const name = mealName.trim() || (components.length === 1 ? components[0].name : `${components[0].name} + ${components.length - 1} more`);
    const { error } = await supabase.from("meal_templates").insert({
      user_id: user.id, name, calories: agg.calories, protein_g: agg.protein_g, carbs_g: agg.carbs_g, fat_g: agg.fat_g, nutrition_meta: agg.nutrition_meta,
    });
    if (!error) loadTemplates(user.id);
  };
  const loadTemplate = (t: MealLog) => {
    setComponents(t.nutrition_meta?.components ?? []);
    setMealName(t.name);
  };

  const builderTotals = aggregateComponents(components);

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-lime text-xs font-mono uppercase tracking-[0.2em] mb-1.5">Intake · Log</p>
        <h1 className="font-display font-black text-4xl uppercase tracking-tight leading-[0.95] text-text-primary">Calorie Tracker</h1>
        <p className="text-text-secondary mt-2">Log meals manually or let AI identify your food.</p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <button onClick={goToPrevDay} aria-label="Previous day" className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-bright transition-all text-sm">‹</button>
        <div className="flex-1 text-center">
          <p className="font-display font-bold text-text-primary text-sm">{formatDate(selectedDate)}</p>
          {!isToday && <p className="text-text-muted text-xs mt-0.5">{selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}
        </div>
        <button onClick={goToNextDay} disabled={isToday} aria-label="Next day"
          className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-bright transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">›</button>
      </div>

      {/* Daily macro summary — ring + macro split */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <MacroRing protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="num font-display font-black text-2xl text-text-primary leading-none">{Math.round(totalCals)}</span>
              <span className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">kcal</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {[
              { label: "Protein", val: totalProtein, mult: 4, color: "bg-lime", text: "text-lime" },
              { label: "Carbs", val: totalCarbs, mult: 4, color: "bg-amber-app", text: "text-amber-app" },
              { label: "Fat", val: totalFat, mult: 9, color: "bg-cyan-app", text: "text-cyan-app" },
            ].map((m) => {
              const macroCals = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
              const pct = macroCals > 0 ? Math.round((m.val * m.mult / macroCals) * 100) : 0;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary text-xs">{m.label}</span>
                    <span className="text-xs">
                      <span className={`num font-display font-bold ${m.text}`}>{Math.round(m.val)}g</span>
                      <span className="text-text-muted"> · {pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex bg-surface border border-border rounded-xl p-1 mb-6 gap-0.5 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 whitespace-nowrap py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === t.id ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Backdated logging — choose when this entry happened (defaults to the viewed day) */}
      {activeTab !== "log" && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-card border border-border rounded-xl">
          <svg className="w-4 h-4 text-lime flex-shrink-0" fill="none" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-text-secondary text-xs whitespace-nowrap">Logging for</span>
          <input type="datetime-local" value={logAt} max={toLocalInput(new Date())}
            onChange={(e) => setLogAt(e.target.value)}
            className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-lime/50" />
        </div>
      )}

      {activeTab === "search" && (
        <FoodSearchTab onLog={logFood} saving={saving}
          recents={recents.map((r) => ({ name: r.name, calories: r.calories, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g }))}
          onRelog={(i) => relogRecent(recents[i])} />
      )}

      {activeTab === "log" && (
        <div>
          {logs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl text-center py-16">
              <p className="text-4xl mb-4">🍽️</p>
              <p className="text-text-secondary">{isToday ? "Nothing logged yet today." : `No meals logged on ${formatDate(selectedDate)}.`}</p>
              <div className="flex flex-col items-center gap-2 mt-3">
                <button onClick={() => setActiveTab("search")} className="text-lime text-sm hover:text-lime-glow transition-colors">Search, scan, or log a meal →</button>
                <button onClick={copyPreviousDay} disabled={saving} className="text-text-muted text-xs hover:text-text-secondary transition-colors disabled:opacity-50">↧ Copy yesterday&apos;s meals</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {groupByTime(logs).map(({ label, emoji, entries }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-sm">{emoji}</span>
                    <span className="text-text-muted text-xs font-mono uppercase tracking-wider">{label}</span>
                    <div className="flex-1 h-px bg-border" />
                    {entries.length >= 2 && (
                      <button
                        onClick={() => setSelectedGroup({ label, emoji, entries })}
                        className="px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted text-[10px] hover:text-text-primary hover:border-border-bright transition-all"
                      >
                        breakdown ›
                      </button>
                    )}
                    {(() => {
                      const slotCals = entries.reduce((s, e) => s + e.calories, 0);
                      const slotTarget = Math.round(calorieTarget * (SLOT_FRACTION[label] ?? 0.3));
                      const over = slotCals > slotTarget * 1.15;
                      return (
                        <span className="num text-xs font-mono" title={`${label} target ≈ ${slotTarget} kcal`}>
                          <span className={over ? "text-amber-app" : "text-text-muted"}>{slotCals}</span>
                          <span className="text-text-muted/60"> / {slotTarget}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    {entries.map((entry, i) => (
                      <div key={entry.id}
                        onClick={() => entries.length >= 2 ? setSelectedGroup({ label, emoji, entries }) : setSelectedEntry(entry)}
                        className={`relative flex items-center gap-4 p-4 group transition-all cursor-pointer hover:bg-surface/50 ${i < entries.length - 1 ? "border-b border-border" : ""} ${savedId === entry.id ? "bg-lime/5" : ""}`}
                        style={savedId === entry.id ? { boxShadow: "inset 0 0 0 1px rgba(52,199,89,0.3)" } : undefined}>
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                          style={{ background: entry.protein_g >= entry.carbs_g && entry.protein_g >= entry.fat_g ? "#34C759" : entry.carbs_g >= entry.fat_g ? "#FF9F0A" : "#32ADE6" }} />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ml-2 ${savedId === entry.id ? "bg-lime text-canvas border border-lime" : entry.source === "ai_photo" || entry.source === "ai_describe" || entry.source === "ai_brand" ? "bg-lime/10 text-lime border border-lime/20" : "bg-surface text-text-muted border border-border"}`}>
                          {savedId === entry.id ? "✓" : entry.source.startsWith("ai") ? "AI" : "M"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{entry.name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-text-muted text-xs font-mono">
                              {new Date(entry.logged_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {entry.protein_g > 0 && <span className="px-1.5 py-0.5 rounded text-xs bg-lime/10 text-lime font-mono border border-lime/20">{entry.protein_g}g P</span>}
                            {entry.carbs_g > 0 && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-app/10 text-amber-app font-mono border border-amber-app/20">{entry.carbs_g}g C</span>}
                            {entry.fat_g > 0 && <span className="px-1.5 py-0.5 rounded text-xs bg-cyan-app/10 text-cyan-app font-mono border border-cyan-app/20">{entry.fat_g}g F</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="num font-display font-bold text-text-primary text-lg leading-none">{entry.calories}</p>
                            <p className="text-text-muted text-xs mt-0.5">kcal</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }} aria-label={`Remove ${entry.name}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-red-400 hover:border-red-400/30 text-xs">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "camera" && (
        <div className="space-y-4">
          {userTier !== "pro" ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-lime" fill="none" viewBox="0 0 24 24">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-display font-bold text-text-primary text-lg mb-2">Pro Feature</h3>
              <p className="text-text-secondary text-sm mb-1 max-w-xs mx-auto">AI photo scanning uses Forage Vision and is available on Pro.</p>
              <p className="text-text-muted text-xs mb-6 max-w-xs mx-auto">Use the Describe or Brand tabs to log food for free.</p>
              <Link href="/dashboard/settings/billing" className="inline-block px-6 py-3 bg-lime text-canvas font-display font-bold rounded-xl hover:bg-lime-glow transition-all shadow-lime-sm text-sm">
                Upgrade to Pro — $7.99/mo
              </Link>
            </div>
          ) : !imagePreview ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">📷</div>
              <h3 className="font-display font-bold text-text-primary mb-2">Add a food photo</h3>
              <p className="text-text-secondary text-sm mb-5">Our AI will identify the food and estimate calories &amp; macros</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-lime text-canvas font-display font-bold rounded-xl text-sm hover:bg-lime-glow transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20"><rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 5l1-2h4l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  Take Photo
                </button>
                <button onClick={() => libraryRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border text-text-primary rounded-xl text-sm hover:border-lime/40 transition-all">
                  <svg className="w-4 h-4 text-lime" fill="none" viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 13l4-3.5 3 2.5 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7.5" r="1.2" fill="currentColor"/></svg>
                  Choose from Library
                </button>
              </div>
              {/* capture=camera opens the rear camera; the library input omits capture so the OS shows the photo picker (asks permission as needed) */}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
              <input ref={libraryRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="food" className="w-full max-h-64 object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-canvas/80 flex flex-col items-center justify-center gap-3">
                    <ForageSpinner size={36} />
                    <p className="text-lime text-sm font-mono">Analyzing with Forage Vision...</p>
                  </div>
                )}
              </div>
              {aiResult && (
                <div className="bg-lime/5 border border-lime/30 rounded-2xl p-5 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-2 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-xs font-mono">AI ESTIMATE</div>
                  </div>
                  <h3 className="font-display font-bold text-text-primary text-lg mb-3">{aiResult.name}</h3>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[{ label: "Calories", value: aiResult.calories, unit: "kcal" }, { label: "Protein", value: aiResult.protein_g, unit: "g" }, { label: "Carbs", value: aiResult.carbs_g, unit: "g" }, { label: "Fat", value: aiResult.fat_g, unit: "g" }].map((s) => (
                      <div key={s.label} className="text-center bg-surface border border-border rounded-xl p-2">
                        <p className="num font-bold text-text-primary text-lg">{s.value}</p>
                        <p className="text-text-muted text-xs">{s.unit}</p>
                        <p className="text-text-muted text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={addAiResult} disabled={saving}
                      className="flex-1 bg-lime text-canvas font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all disabled:opacity-50">
                      {saving ? "Saving..." : "Add to Log"}
                    </button>
                    <button onClick={() => { setImagePreview(null); setAiResult(null); setImageFile(null); }}
                      className="px-5 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:border-border-bright transition-all">
                      Retake
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "describe" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Describe your meal</label>
              <textarea
                value={describeText}
                onChange={(e) => { setDescribeText(e.target.value); setAiResult(null); }}
                placeholder="e.g. I had a large bowl of oatmeal with a scoop of protein powder, some blueberries, and a tablespoon of peanut butter"
                rows={4}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all resize-none leading-relaxed"
              />
              <p className="text-text-muted text-xs mt-2">Be as specific as possible — portion sizes, cooking method, and ingredients help Forage estimate more accurately.</p>
            </div>

            <button
              onClick={handleDescribeAnalyze}
              disabled={!describeText.trim() || analyzing}
              className="w-full flex items-center justify-center gap-2 bg-lime/10 border border-lime/30 hover:border-lime/50 rounded-xl py-3 text-lime font-medium text-sm transition-all hover:bg-lime/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <><ForageSpinner size={16} />Analyzing...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 2v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Estimate with AI</>
              )}
            </button>
          </div>

          {aiError && !analyzing && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">{aiError}</div>
          )}

          {aiResult && !analyzing && (
            <div className="bg-lime/5 border border-lime/30 rounded-2xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-2 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-xs font-mono">AI ESTIMATE</div>
                <span className="text-text-muted text-xs">based on your description</span>
              </div>
              <h3 className="font-display font-bold text-text-primary text-lg mb-3">{aiResult.name}</h3>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Calories", value: aiResult.calories, unit: "kcal" },
                  { label: "Protein", value: aiResult.protein_g, unit: "g" },
                  { label: "Carbs", value: aiResult.carbs_g, unit: "g" },
                  { label: "Fat", value: aiResult.fat_g, unit: "g" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-surface border border-border rounded-xl p-2">
                    <p className="num font-bold text-text-primary text-lg">{s.value}</p>
                    <p className="text-text-muted text-xs">{s.unit}</p>
                    <p className="text-text-muted text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={addAiResult} disabled={saving}
                  className="flex-1 bg-lime text-canvas font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all disabled:opacity-50">
                  {saving ? "Saving..." : "Add to Log"}
                </button>
                <button onClick={() => { setAiResult(null); setDescribeText(""); }}
                  className="px-5 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:border-border-bright transition-all">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "brand" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Brand <span className="text-lime">*</span></label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => { setBrandName(e.target.value); setAiResult(null); }}
                  placeholder="e.g. McDonald's, Quest, Chobani"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Product <span className="text-lime">*</span></label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => { setProductName(e.target.value); setAiResult(null); }}
                  placeholder="e.g. Big Mac, Chocolate Chip Bar"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Serving Size <span className="text-text-muted font-normal normal-case tracking-normal">(optional)</span></label>
              <input
                type="text"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder="e.g. 1 bar, 2 scoops, large, 100g"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
              />
            </div>

            <div className="flex items-start gap-3 bg-surface border border-border rounded-xl px-4 py-3">
              <span className="text-lime text-sm mt-0.5">✦</span>
              <p className="text-text-muted text-xs leading-relaxed">Works great for restaurants, protein bars, packaged foods, supplements, and fast food. Forage knows nutrition labels for thousands of products.</p>
            </div>

            <button
              onClick={handleBrandAnalyze}
              disabled={(!brandName.trim() && !productName.trim()) || analyzing}
              className="w-full flex items-center justify-center gap-2 bg-lime/10 border border-lime/30 hover:border-lime/50 rounded-xl py-3 text-lime font-medium text-sm transition-all hover:bg-lime/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <><ForageSpinner size={16} />Looking up nutrition facts...</>
              ) : (
                <>🔍 Look Up Nutrition Facts</>
              )}
            </button>
          </div>

          {aiResult && !analyzing && (
            <div className="bg-lime/5 border border-lime/30 rounded-2xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-2 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-xs font-mono">BRAND DATA</div>
                <span className="text-text-muted text-xs">via Forage AI</span>
              </div>
              <h3 className="font-display font-bold text-text-primary text-lg mb-3">{aiResult.name}</h3>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Calories", value: aiResult.calories, unit: "kcal" },
                  { label: "Protein", value: aiResult.protein_g, unit: "g" },
                  { label: "Carbs", value: aiResult.carbs_g, unit: "g" },
                  { label: "Fat", value: aiResult.fat_g, unit: "g" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-surface border border-border rounded-xl p-2">
                    <p className="num font-bold text-text-primary text-lg">{s.value}</p>
                    <p className="text-text-muted text-xs">{s.unit}</p>
                    <p className="text-text-muted text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={addAiResult} disabled={saving}
                  className="flex-1 bg-lime text-canvas font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all disabled:opacity-50">
                  {saving ? "Saving..." : "Add to Log"}
                </button>
                <button onClick={() => { setAiResult(null); setBrandName(""); setProductName(""); setServingSize(""); }}
                  className="px-5 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:border-border-bright transition-all">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedGroup && (
        <MealGroupModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onSelectEntry={(e) => { setSelectedGroup(null); setSelectedEntry(e); }}
        />
      )}

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={(id) => { removeEntry(id); setSelectedEntry(null); }}
          onUpdate={updateEntry}
        />
      )}

      {activeTab === "build" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-card border border-border rounded-2xl px-4 py-3">
            <span className="text-lime text-sm mt-0.5">🧩</span>
            <p className="text-text-muted text-xs leading-relaxed">Craft a full meal from individual parts. Add each food with its amount — enter macros yourself or let AI estimate them. You&apos;ll see the combined protein &amp; macro breakdown for every part, saved together as one meal you can reopen anytime.</p>
          </div>

          {/* Saved templates — tap to load into the builder */}
          {templates.length > 0 && components.length === 0 && (
            <div>
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-mono mb-2 px-1">Your templates · tap to load</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => loadTemplate(t)}
                    className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 hover:border-lime/40 hover:bg-lime/5 transition-all">
                    <span className="text-text-primary text-xs font-medium max-w-[160px] truncate">{t.name}</span>
                    <span className="num text-lime text-xs font-display font-bold">{t.calories}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live running total */}
          {components.length > 0 && (
            <div className="bg-lime/5 border border-lime/20 rounded-2xl p-5">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <MacroRing protein={builderTotals.protein_g} carbs={builderTotals.carbs_g} fat={builderTotals.fat_g} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="num font-display font-black text-2xl text-text-primary leading-none">{builderTotals.calories}</span>
                    <span className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">kcal</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[
                    { label: "Protein", val: builderTotals.protein_g, text: "text-lime" },
                    { label: "Carbs", val: builderTotals.carbs_g, text: "text-amber-app" },
                    { label: "Fat", val: builderTotals.fat_g, text: "text-cyan-app" },
                  ].map((m) => (
                    <div key={m.label} className="text-center bg-surface border border-border rounded-xl py-2.5">
                      <p className={`num font-display font-black text-xl leading-none ${m.text}`}>{Math.round(m.val)}</p>
                      <p className="text-text-muted text-[10px] mt-1">g {m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {(() => {
                const mm = builderTotals.nutrition_meta;
                const chips = [
                  mm.fiber_g ? `${mm.fiber_g}g fiber` : null,
                  mm.sugar_g ? `${mm.sugar_g}g sugar` : null,
                  mm.saturated_fat_g ? `${mm.saturated_fat_g}g sat fat` : null,
                  mm.sodium_mg ? `${mm.sodium_mg}mg sodium` : null,
                ].filter(Boolean) as string[];
                return chips.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {chips.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted text-[10px] font-mono">{c}</span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Component list */}
          {components.length > 0 && (
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ITEM_COLORS[i % ITEM_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate leading-tight">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {c.amount && <span className="text-text-muted text-[10px] font-mono">{c.amount}</span>}
                      {c.protein_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-lime/10 text-lime font-mono border border-lime/20">{Math.round(c.protein_g)}P</span>}
                      {c.carbs_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-app/10 text-amber-app font-mono border border-amber-app/20">{Math.round(c.carbs_g)}C</span>}
                      {c.fat_g > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-app/10 text-cyan-app font-mono border border-cyan-app/20">{Math.round(c.fat_g)}F</span>}
                    </div>
                  </div>
                  <span className="num font-display font-bold text-text-primary text-sm flex-shrink-0">{Math.round(c.calories)}</span>
                  <div className="flex flex-col flex-shrink-0">
                    <button onClick={() => moveComponent(i, -1)} disabled={i === 0} aria-label="Move part up"
                      className="text-text-muted hover:text-text-primary disabled:opacity-20 text-[10px] leading-none p-0.5">▲</button>
                    <button onClick={() => moveComponent(i, 1)} disabled={i === components.length - 1} aria-label="Move part down"
                      className="text-text-muted hover:text-text-primary disabled:opacity-20 text-[10px] leading-none p-0.5">▼</button>
                  </div>
                  <button onClick={() => removeComponent(i)} aria-label="Remove part"
                    className="w-6 h-6 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-red-400 hover:border-red-400/30 text-xs flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add a part */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <p className="text-xs text-text-muted uppercase tracking-wider">Add a part</p>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={compAmount} onChange={(e) => { setCompAmount(e.target.value); setCompMeta(null); }} placeholder="150g / 1 cup"
                className="col-span-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all" />
              <input type="text" value={compName} onChange={(e) => { setCompName(e.target.value); setCompMeta(null); }} placeholder="Chicken breast"
                onKeyDown={(e) => { if (e.key === "Enter" && compName.trim() && compCals) addComponent(); }}
                className="col-span-2 bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all" />
            </div>

            <button onClick={estimateComponent} disabled={!compName.trim() || compEstimating}
              className="w-full flex items-center justify-center gap-2 bg-lime/10 border border-lime/30 hover:border-lime/50 rounded-xl py-2.5 text-lime font-medium text-sm transition-all hover:bg-lime/15 disabled:opacity-40 disabled:cursor-not-allowed">
              {compEstimating ? <><ForageSpinner size={14} />Estimating…</> : <>✨ Estimate macros with AI</>}
            </button>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Cals", value: compCals, set: setCompCals, unit: "" },
                { label: "Protein", value: compProtein, set: setCompProtein, unit: "g" },
                { label: "Carbs", value: compCarbs, set: setCompCarbs, unit: "g" },
                { label: "Fat", value: compFat, set: setCompFat, unit: "g" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[10px] text-text-muted mb-1">{f.label}</label>
                  <input type="number" min={0} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder="0"
                    className="w-full bg-surface border border-border rounded-xl px-2.5 py-2 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all num" />
                </div>
              ))}
            </div>

            {compError && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{compError}</p>}

            <button onClick={addComponent} disabled={!compName.trim() || !compCals}
              className="w-full bg-surface border border-border rounded-xl py-2.5 text-text-primary font-medium text-sm hover:border-border-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              + Add part to meal
            </button>
          </div>

          {/* Name & save */}
          {components.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Meal name <span className="text-text-muted font-normal normal-case tracking-normal">(optional)</span></label>
                <input type="text" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Post-Workout Bowl"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all" />
              </div>
              <button onClick={saveMeal} disabled={saving}
                className="w-full bg-lime text-canvas font-display font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? "Saving…" : `Save Meal · ${components.length} part${components.length !== 1 ? "s" : ""}`}
              </button>
              <button onClick={saveTemplate} disabled={saving}
                className="w-full bg-surface border border-border text-text-secondary rounded-xl py-2.5 text-sm hover:border-lime/40 hover:text-text-primary transition-all disabled:opacity-40">
                ☆ Save as reusable template
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "manual" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Food Name</label>
            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Grilled Chicken Breast"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Calories", value: manualCals, set: setManualCals, unit: "kcal", required: true },
              { label: "Protein", value: manualProtein, set: setManualProtein, unit: "g", required: false },
              { label: "Carbs", value: manualCarbs, set: setManualCarbs, unit: "g", required: false },
              { label: "Fat", value: manualFat, set: setManualFat, unit: "g", required: false },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-text-muted mb-1.5">{f.label} {f.required && <span className="text-lime">*</span>}</label>
                <div className="relative">
                  <input type="number" value={f.value} onChange={(e) => f.set(e.target.value)} placeholder="0" min={0}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all num pr-8" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addManualEntry} disabled={!manualName || !manualCals || saving}
            className="w-full bg-lime text-canvas font-display font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Add to Log"}
          </button>
        </div>
      )}

      {/* Undo toast — re-inserts a just-deleted entry */}
      {lastDeleted && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[55] bottom-20 lg:bottom-6 flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-3 shadow-card animate-slide-up">
          <span className="text-text-secondary text-sm">Removed <span className="text-text-primary font-medium">{lastDeleted.name}</span></span>
          <button onClick={undoDelete} className="text-lime font-display font-bold text-sm uppercase tracking-wider hover:text-lime-glow transition-colors">Undo</button>
        </div>
      )}
    </div>
  );
}
