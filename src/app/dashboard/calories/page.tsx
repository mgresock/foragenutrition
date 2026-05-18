"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import Link from "next/link";

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
}
interface MealLog { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; logged_at: string; source: string; nutrition_meta?: NutritionMeta; }

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
      <circle cx="50" cy="50" r="40" fill="none" stroke="#b6f040" strokeWidth="12"
        strokeDasharray={`${Math.max(0, pLen - gap)} ${C - Math.max(0, pLen - gap)}`}
        strokeDashoffset="0" strokeLinecap="round" />
      {/* carbs - amber */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#f0a030" strokeWidth="12"
        strokeDasharray={`${Math.max(0, cLen - gap)} ${C - Math.max(0, cLen - gap)}`}
        strokeDashoffset={`${-(pLen)}`} strokeLinecap="round" />
      {/* fat - cyan */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#40c8f0" strokeWidth="12"
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

function EntryDetailModal({ entry, onClose, onDelete }: { entry: MealLog; onClose: () => void; onDelete: (id: string) => void }) {
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

  const sourceLabel: Record<string, string> = {
    ai_photo: "Photo", ai_describe: "Described", ai_brand: "Brand", manual: "Manual",
  };

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
                {new Date(entry.logged_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-card border border-border text-text-muted">
                {sourceLabel[entry.source] ?? entry.source}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-sm flex-shrink-0">✕</button>
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

type Tab = "log" | "camera" | "describe" | "brand" | "manual";

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
  const [describeText, setDescribeText] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [describeSource, setDescribeSource] = useState<"ai_photo" | "ai_describe" | "ai_brand">("ai_photo");
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [userEmail, setUserEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
    },
  });

  const loadLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? "");
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
    setUserTier((profile?.subscription_tier as "free" | "pro") ?? "free");
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("meal_logs")
      .select("id, name, calories, protein_g, carbs_g, fat_g, logged_at, source, nutrition_meta")
      .eq("user_id", user.id)
      .gte("logged_at", todayStart.toISOString()).lte("logged_at", todayEnd.toISOString())
      .order("logged_at", { ascending: false });
    if (data) setLogs(data);
  };

  useEffect(() => { loadLogs(); }, []);

  const totalCals = logs.reduce((s, m) => s + m.calories, 0);
  const totalProtein = logs.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = logs.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = logs.reduce((s, m) => s + m.fat_g, 0);

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

  const saveToDb = async (entry: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; source: string; image_path?: string; nutrition_meta?: NutritionMeta }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from("meal_logs").insert({ user_id: user.id, ...entry });
    if (error) console.error("saveToDb error:", error);
    return !error;
  };

  const switchToLog = async () => {
    // Reload logs then switch — the newest entry (index 0, sorted desc) gets highlighted
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const { data } = await supabase.from("meal_logs").select("*").eq("user_id", user.id)
      .gte("logged_at", todayStart.toISOString()).lte("logged_at", todayEnd.toISOString())
      .order("logged_at", { ascending: false });
    if (data) {
      setLogs(data);
      if (data[0]) setSavedId(data[0].id);
    }
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
    await supabase.from("meal_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-text-primary">Calorie Tracker</h1>
        <p className="text-text-secondary mt-1">Log meals manually or let AI identify your food.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Calories", value: Math.round(totalCals), unit: "kcal", color: "text-lime" },
          { label: "Protein", value: Math.round(totalProtein), unit: "g", color: "text-lime" },
          { label: "Carbs", value: Math.round(totalCarbs), unit: "g", color: "text-amber-app" },
          { label: "Fat", value: Math.round(totalFat), unit: "g", color: "text-cyan-app" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`num font-display font-black text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-text-muted text-xs">{s.unit}</p>
          </div>
        ))}
      </div>

      <div className="flex bg-surface border border-border rounded-xl p-1 mb-6">
        {([{ id: "log", label: "Today's Log" }, { id: "camera", label: "📷 Photo" }, { id: "describe", label: "✍️ Describe" }, { id: "brand", label: "🏪 Brand" }, { id: "manual", label: "Manual" }] as const).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "log" && (
        <div>
          {logs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl text-center py-16">
              <p className="text-4xl mb-4">🍽️</p>
              <p className="text-text-secondary">Nothing logged yet today.</p>
              <button onClick={() => setActiveTab("camera")} className="mt-3 text-lime text-sm hover:text-lime-glow transition-colors">Take a photo or log manually →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupByTime(logs).map(({ label, emoji, entries }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-sm">{emoji}</span>
                    <span className="text-text-muted text-xs font-mono uppercase tracking-wider">{label}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="num text-text-muted text-xs font-mono">
                      {entries.reduce((s, e) => s + e.calories, 0)} kcal
                    </span>
                  </div>
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    {entries.map((entry, i) => (
                      <div key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`relative flex items-center gap-4 p-4 group transition-all cursor-pointer hover:bg-surface/50 ${i < entries.length - 1 ? "border-b border-border" : ""} ${savedId === entry.id ? "bg-lime/5" : ""}`}
                        style={savedId === entry.id ? { boxShadow: "inset 0 0 0 1px rgba(182,240,64,0.3)" } : undefined}>
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                          style={{ background: entry.protein_g >= entry.carbs_g && entry.protein_g >= entry.fat_g ? "#b6f040" : entry.carbs_g >= entry.fat_g ? "#f0a030" : "#40c8f0" }} />
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
                          <button onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }}
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
          {(userTier !== "pro" && userEmail.toLowerCase() !== "mcgresock@gmail.com") ? (
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
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-lime/40 hover:bg-lime/5 transition-all group">
              <div className="text-5xl mb-4">📷</div>
              <h3 className="font-display font-bold text-text-primary mb-2">Take or upload a photo</h3>
              <p className="text-text-secondary text-sm mb-4">Our AI will identify the food and estimate calories & macros</p>
              <span className="inline-block px-4 py-2 bg-lime/10 border border-lime/30 rounded-xl text-lime text-sm group-hover:bg-lime/20 transition-all">Choose Photo</span>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
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

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={(id) => { removeEntry(id); setSelectedEntry(null); }}
        />
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
    </div>
  );
}
