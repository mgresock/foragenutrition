"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getSupplementEffect } from "@/lib/supplementEffects";
import { computeTargets, goalFromGoals } from "@/lib/nutrition";

const FUN_FACTS = [
  { emoji: "🍌", fact: "Bananas are one of the best sources of potassium, which helps regulate blood pressure and supports muscle contractions during workouts." },
  { emoji: "🥑", fact: "Avocados are loaded with monounsaturated fat and potassium — they help reduce LDL cholesterol and keep your heart healthy." },
  { emoji: "🫐", fact: "Blueberries are packed with anthocyanins that reduce muscle soreness after exercise and improve recovery time." },
  { emoji: "🥚", fact: "Eggs contain all 9 essential amino acids, making them one of the highest-quality complete proteins you can eat." },
  { emoji: "🐟", fact: "Salmon's omega-3 fatty acids reduce inflammation, improve brain function, and support joint health for heavy lifters." },
  { emoji: "🧄", fact: "Garlic contains allicin, which has been shown to lower blood pressure and reduce LDL cholesterol naturally." },
  { emoji: "🍠", fact: "Sweet potatoes are rich in beta-carotene and complex carbs — a perfect pre-workout fuel that won't spike your blood sugar sharply." },
  { emoji: "🥦", fact: "Broccoli contains sulforaphane, a compound that may help reduce cancer risk and supports liver detoxification." },
  { emoji: "🌰", fact: "Almonds are high in vitamin E, which protects cell membranes from oxidative damage during intense exercise." },
  { emoji: "🍳", fact: "Eggs for breakfast have been shown to reduce total calorie intake throughout the day by up to 400 calories compared to a bagel breakfast." },
  { emoji: "🥛", fact: "Greek yogurt has up to 3x more protein than regular yogurt and contains probiotics that improve gut health and immunity." },
  { emoji: "🍋", fact: "Lemon juice with water first thing in the morning stimulates digestion and provides a hit of vitamin C that boosts iron absorption." },
  { emoji: "🌿", fact: "Spinach contains nitrates that improve muscle efficiency — athletes who eat spinach regularly need less oxygen to perform the same work." },
  { emoji: "🫘", fact: "Black beans provide both protein and fiber, creating a slow digestion effect that keeps you full for hours and stabilizes blood sugar." },
  { emoji: "🍫", fact: "Dark chocolate (70%+) contains flavonoids that improve blood flow to the brain and muscles, boosting both performance and focus." },
  { emoji: "🌾", fact: "Oats contain beta-glucan fiber, which feeds beneficial gut bacteria and has been clinically proven to lower LDL cholesterol." },
  { emoji: "🥜", fact: "Peanut butter is one of the most calorie-dense affordable foods — just 2 tbsp gives you 8g protein and healthy fats for energy." },
  { emoji: "🍖", fact: "Beef liver is the most nutrient-dense food on earth — one serving provides over 100% of B12, folate, copper, and vitamin A." },
  { emoji: "🫐", fact: "Blackberries have more fiber per serving than almost any fruit, which feeds gut bacteria linked to reduced inflammation." },
  { emoji: "🧅", fact: "Onions contain quercetin, an antioxidant that reduces histamine reactions, lowers blood pressure, and has anti-cancer properties." },
  { emoji: "🥕", fact: "Carrots contain beta-carotene that converts to vitamin A in the body — essential for skin health, night vision, and immune function." },
  { emoji: "🍅", fact: "Cooking tomatoes increases their lycopene content, an antioxidant linked to reduced risk of prostate cancer and heart disease." },
  { emoji: "🧃", fact: "Tart cherry juice reduces muscle soreness by up to 20% after hard training and improves sleep quality due to natural melatonin." },
  { emoji: "💧", fact: "Being just 2% dehydrated reduces strength output by up to 10% and cognitive performance by 20%. Drink before you feel thirsty." },
  { emoji: "🌶️", fact: "Capsaicin in chili peppers temporarily boosts metabolism by up to 5% and reduces appetite — making spicy food a natural fat-burning aid." },
  { emoji: "🦐", fact: "Shrimp is one of the leanest protein sources — 100g has 24g protein and only 99 calories, with almost zero fat." },
  { emoji: "🥗", fact: "Kale contains more vitamin C per calorie than an orange, and more calcium per calorie than milk — all in a zero-fat package." },
  { emoji: "🍯", fact: "Raw honey contains enzymes, antioxidants, and natural antimicrobials. It has a lower glycemic response than table sugar." },
  { emoji: "🫚", fact: "Olive oil's oleocanthal has anti-inflammatory properties similar to ibuprofen — regular use is associated with lower dementia risk." },
  { emoji: "🌊", fact: "Seaweed is the richest natural source of iodine, which is essential for thyroid function and metabolism regulation." },
  { emoji: "🥩", fact: "Red meat contains heme iron, which is absorbed 2-3x more efficiently than the non-heme iron in plant foods." },
  { emoji: "🍄", fact: "Mushrooms are the only plant-based food that naturally produces vitamin D when exposed to sunlight — just like human skin." },
  { emoji: "🥝", fact: "Kiwi contains actinidin, an enzyme that breaks down protein in your stomach faster, improving digestion and nutrient absorption." },
  { emoji: "🌻", fact: "Sunflower seeds are one of the best sources of vitamin E — a powerful antioxidant that protects muscle cells during hard training." },
  { emoji: "🫛", fact: "Edamame is a complete protein, rare for a plant food — one cup gives you 17g of protein with all essential amino acids." },
  { emoji: "🍒", fact: "Cherries contain melatonin naturally, making them one of the few foods that can meaningfully improve sleep quality and duration." },
  { emoji: "🐓", fact: "Chicken breast has one of the best protein-to-calorie ratios of any food — 31g protein per 165 calories, almost zero carbs or fat." },
  { emoji: "🌱", fact: "Chia seeds absorb up to 12x their weight in water, forming a gel that slows digestion and helps you feel full for longer." },
  { emoji: "🧀", fact: "Cottage cheese is high in casein protein, which digests slowly overnight — making it ideal as a late-night snack for muscle recovery." },
  { emoji: "🦴", fact: "Bone broth contains glycine and proline, amino acids that support joint cartilage, gut lining repair, and collagen production." },
  { emoji: "🍇", fact: "Grapes contain resveratrol, which activates longevity genes (sirtuins) and has been shown to improve insulin sensitivity." },
  { emoji: "🥙", fact: "Chickpeas contain tryptophan, a precursor to serotonin — eating them regularly can help stabilize mood and reduce anxiety." },
  { emoji: "🌮", fact: "Quinoa is one of the only grains that's a complete protein, containing all 9 essential amino acids unlike rice or wheat." },
  { emoji: "🍊", fact: "Vitamin C in citrus fruits dramatically increases iron absorption from plant foods — combine them in the same meal for maximum effect." },
  { emoji: "🫀", fact: "Walnuts are the only nut with significant omega-3 fatty acids (ALA), which supports heart health and reduces triglycerides." },
  { emoji: "🧠", fact: "Fatty fish like sardines supply DHA, the omega-3 that makes up 30% of your brain's gray matter — crucial for memory and focus." },
  { emoji: "💪", fact: "Creatine found naturally in red meat fuels your muscles' ATP system — the primary energy source for explosive, high-intensity exercise." },
  { emoji: "🫁", fact: "Beets contain dietary nitrates that dilate blood vessels, improving oxygen delivery to muscles and boosting endurance by up to 16%." },
  { emoji: "🌿", fact: "Turmeric's curcumin is as effective as ibuprofen for reducing exercise-induced muscle soreness with no side effects." },
  { emoji: "🍎", fact: "Apples contain pectin, a prebiotic fiber that feeds Lactobacillus bacteria — one of the most beneficial gut bacteria for immunity." },
];

function DailyFact() {
  const [fact, setFact] = useState(FUN_FACTS[0]);
  useEffect(() => {
    setFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
  }, []);
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface border border-border rounded-xl overflow-hidden">
      <span className="text-base flex-shrink-0">{fact.emoji}</span>
      <p className="text-text-muted text-[11px] leading-relaxed truncate sm:whitespace-normal sm:overflow-visible">
        <span className="text-lime font-medium">Did you know?</span>{" "}{fact.fact}
      </p>
    </div>
  );
}

interface NutritionMeta { fiber_g?: number; sugar_g?: number; sodium_mg?: number; vitamin_c_mg?: number; vitamin_d_mcg?: number; vitamin_b12_mcg?: number; calcium_mg?: number; iron_mg?: number; potassium_mg?: number; magnesium_mg?: number; }
interface MealLog { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; logged_at: string; nutrition_meta?: NutritionMeta | null; }
interface Supplement { id: string; name: string; dose: string | null; timing: string; active: boolean; }
interface Onboarding { goals: string[] | null; meals_per_week: number | null; }
interface Insight { type: string; title: string; body: string; }
const CALORIE_GOAL = 2600;
const PROTEIN_GOAL = 180;

const INSIGHT_ICONS: Record<string, string> = {
  protein: "💪", calories: "🔥", timing: "⏱️", consistency: "📈", carbs: "🌾", fat: "🥑", general: "⚡",
};

function computeStreak(allDates: string[]): number {
  const unique = [...new Set(allDates)].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  for (let i = 0; i < unique.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (unique[i] === expected.toISOString().split("T")[0]) streak++;
    else break;
  }
  return streak;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [streak, setStreak] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ date: string; label: string; cals: number }[]>([]);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [tier, setTier] = useState<"free" | "pro" | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [customWaterInput, setCustomWaterInput] = useState("");
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [targets, setTargets] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number }>({ calories: CALORIE_GOAL, protein_g: PROTEIN_GOAL, carbs_g: 300, fat_g: 75 });

  const fetchInsights = useCallback(async (recentLogs: MealLog[], onboardingData: Onboarding | null) => {
    const cacheKey = "forage_insights";
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) { setInsights(data); return; }
    }
    setInsightsLoading(true);
    const res = await fetch("/api/nutrition-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: recentLogs, profile: onboardingData }),
    });
    const data = await res.json();
    if (data.insights) {
      setInsights(data.insights);
      localStorage.setItem(cacheKey, JSON.stringify({ data: data.insights, ts: Date.now() }));
    }
    setInsightsLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ data: logsData }, { data: profileData }, { data: onboardingData }, { data: recentLogs }, { data: streakLogs }, { data: tierData }] = await Promise.all([
        supabase.from("meal_logs").select("id, name, calories, protein_g, carbs_g, fat_g, logged_at, nutrition_meta").eq("user_id", user.id).gte("logged_at", todayStart.toISOString()).lte("logged_at", todayEnd.toISOString()).order("logged_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
        supabase.from("onboarding").select("*").eq("user_id", user.id).single(),
        supabase.from("meal_logs").select("name, calories, protein_g, carbs_g, fat_g, logged_at").eq("user_id", user.id).gte("logged_at", sevenDaysAgo.toISOString()).order("logged_at", { ascending: false }).limit(300),
        supabase.from("meal_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", thirtyDaysAgo.toISOString()).order("logged_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("subscription_tier, ai_requests_month").eq("id", user.id).single(),
      ]);

      if (logsData) setLogs(logsData);
      if (profileData) setProfile(profileData);
      if (onboardingData) setOnboarding(onboardingData);

      // Personalized daily targets: prefer stored targets (set via Macro Calc /
      // adaptive engine), else compute from body stats with Mifflin-St Jeor.
      const ob = onboardingData as Record<string, unknown> | null;
      if (ob) {
        const t = computeTargets({
          sex: ob.sex as string, age: ob.age as number, height_cm: ob.height_cm as number,
          weight_kg: ob.weight_kg as number, activity: ob.activity_level as string,
          goal: goalFromGoals(ob.goals),
        });
        setTargets({
          calories: (ob.daily_calorie_target as number) || t.calories,
          protein_g: (ob.protein_target as number) || t.protein_g,
          carbs_g: (ob.carbs_target as number) || t.carbs_g,
          fat_g: (ob.fat_target as number) || t.fat_g,
        });
      }
      if (tierData) {
        const effectiveTier = (tierData.subscription_tier as "free" | "pro") ?? "free";
        setTier(effectiveTier);
        if (effectiveTier !== "pro") {
          setAiRemaining(Math.max(0, 15 - (tierData.ai_requests_month ?? 0)));
        }
      }

      // Streak
      if (streakLogs) {
        const dates = streakLogs.map((l) => l.logged_at.split("T")[0]);
        setStreak(computeStreak(dates));
      }

      // Weekly bars
      if (recentLogs) {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const iso = d.toISOString().split("T")[0];
          const cals = recentLogs.filter((l) => l.logged_at.startsWith(iso)).reduce((s, l) => s + l.calories, 0);
          return { date: iso, label: d.toLocaleDateString("en-US", { weekday: "short" }), cals };
        });
        setWeeklyData(days);
      }

      // Water logs for today
      const { data: waterData } = await supabase
        .from("water_logs")
        .select("ml")
        .eq("user_id", user.id)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString())
        .limit(100);
      if (waterData) setWaterMl(waterData.reduce((s, r) => s + r.ml, 0));

      // Active supplements
      const { data: suppData } = await supabase
        .from("supplements")
        .select("id, name, dose, timing, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at")
        .limit(100);
      if (suppData) setSupplements(suppData);

      if (recentLogs && recentLogs.length > 0) {
        const uniqueDays = new Set(recentLogs.map((l) => l.logged_at.split("T")[0]));
        if (uniqueDays.size >= 3) {
          setShowInsights(true);
          fetchInsights(recentLogs as MealLog[], onboardingData);
        }
      }
    };
    load();
  }, []);

  const totalCals = logs.reduce((s, m) => s + m.calories, 0);
  const totalProtein = logs.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = logs.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = logs.reduce((s, m) => s + m.fat_g, 0);
  const remaining = targets.calories - totalCals;
  const progress = Math.min((totalCals / targets.calories) * 100, 100);
  const proteinProgress = Math.min((totalProtein / targets.protein_g) * 100, 100);

  const firstName = profile?.display_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const totalFiber = logs.reduce((s, m) => s + (m.nutrition_meta?.fiber_g ?? 0), 0);
  const totalSugar = logs.reduce((s, m) => s + (m.nutrition_meta?.sugar_g ?? 0), 0);
  const totalSodium = logs.reduce((s, m) => s + (m.nutrition_meta?.sodium_mg ?? 0), 0);

  const totalVitC = logs.reduce((s, m) => s + (m.nutrition_meta?.vitamin_c_mg ?? 0), 0);
  const totalVitD = logs.reduce((s, m) => s + (m.nutrition_meta?.vitamin_d_mcg ?? 0), 0);
  const totalB12 = logs.reduce((s, m) => s + (m.nutrition_meta?.vitamin_b12_mcg ?? 0), 0);
  const totalCalcium = logs.reduce((s, m) => s + (m.nutrition_meta?.calcium_mg ?? 0), 0);
  const totalIron = logs.reduce((s, m) => s + (m.nutrition_meta?.iron_mg ?? 0), 0);
  const totalPotassium = logs.reduce((s, m) => s + (m.nutrition_meta?.potassium_mg ?? 0), 0);
  const totalMagnesium = logs.reduce((s, m) => s + (m.nutrition_meta?.magnesium_mg ?? 0), 0);
  // Supplement-based adjustments
  const supplementWaterBonus = supplements.filter(s => s.active).reduce((sum, s) => sum + (getSupplementEffect(s.name)?.waterMl ?? 0), 0);
  const supplementVitaminBoost = supplements.filter(s => s.active).reduce((acc, s) => {
    const v = getSupplementEffect(s.name)?.vitamins ?? {};
    return {
      vitamin_c_mg: acc.vitamin_c_mg + (v.vitamin_c_mg ?? 0),
      vitamin_d_mcg: acc.vitamin_d_mcg + (v.vitamin_d_mcg ?? 0),
      vitamin_b12_mcg: acc.vitamin_b12_mcg + (v.vitamin_b12_mcg ?? 0),
      calcium_mg: acc.calcium_mg + (v.calcium_mg ?? 0),
      iron_mg: acc.iron_mg + (v.iron_mg ?? 0),
      potassium_mg: acc.potassium_mg + (v.potassium_mg ?? 0),
      magnesium_mg: acc.magnesium_mg + (v.magnesium_mg ?? 0),
    };
  }, { vitamin_c_mg: 0, vitamin_d_mcg: 0, vitamin_b12_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0, magnesium_mg: 0 });
  const supplementNotes = supplements.filter(s => s.active).flatMap(s => {
    const note = getSupplementEffect(s.name)?.note;
    return note ? [{ name: s.name, note }] : [];
  });

  const hasVitaminData = logs.some((m) => m.nutrition_meta?.vitamin_c_mg != null) || Object.values(supplementVitaminBoost).some(v => v > 0);

  const WATER_GOAL_ML = 2500;
  const adjustedWaterGoal = WATER_GOAL_ML + supplementWaterBonus;
  const waterGlasses = Math.round(waterMl / 250);
  const waterGoalGlasses = Math.round(adjustedWaterGoal / 250);

  const logWater = async (ml: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("water_logs").insert({ user_id: user.id, ml });
    setWaterMl((prev) => prev + ml);
  };

  const MACROS = [
    { label: "Protein", current: Math.round(totalProtein), goal: 180, color: "#34C759", unit: "g" },
    { label: "Carbs", current: Math.round(totalCarbs), goal: 280, color: "#FF9F0A", unit: "g" },
    { label: "Fat", current: Math.round(totalFat), goal: 70, color: "#32ADE6", unit: "g" },
  ];

  const QUICK_ACTIONS = [
    { label: "Log a Meal", href: "/dashboard/calories", icon: "🍽️", desc: "Photo, describe, or manual" },
    { label: "Grocery AI", href: "/dashboard/grocery", icon: "🛒", desc: "High-protein, on budget" },
    { label: "Restaurants", href: "/dashboard/restaurants", icon: "🥗", desc: "Eat out smarter" },
    { label: "Scan Receipt", href: "/dashboard/receipts", icon: "📄", desc: "Track spend & nutrition" },
  ];

  const weeklyMax = Math.max(...weeklyData.map((d) => d.cals), targets.calories);
  const todayIso = new Date().toISOString().split("T")[0];

  /* ── upgrade nudge shared between mobile top and desktop right column ── */
  const UpgradeNudge = tier === "free" ? (
    <Link href="/dashboard/settings/billing"
      className="flex items-center justify-between gap-3 px-4 py-3 bg-lime/5 border border-lime/20 rounded-xl hover:bg-lime/10 hover:border-lime/30 transition-all group">
      <div className="flex items-center gap-3">
        <span className="text-lg">⚡</span>
        <div>
          <p className="text-text-primary text-sm font-medium">
            {aiRemaining === 0
              ? "AI limit reached — upgrade to continue"
              : `${aiRemaining} AI request${aiRemaining === 1 ? "" : "s"} left this month`}
          </p>
          <p className="text-text-muted text-xs">Forage Pro · unlimited AI · $7.99/mo</p>
        </div>
      </div>
      <span className="text-lime text-sm font-display font-bold group-hover:text-lime-glow transition-colors flex-shrink-0">
        Upgrade →
      </span>
    </Link>
  ) : null;

  return (
    <div className="px-5 py-6 pb-24 lg:pb-6">

      {/* ── Header — full width ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-lime text-xs font-mono uppercase tracking-[0.2em]">{today}</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-[0.95] text-text-primary mt-1.5">{greeting}, {firstName}.</h1>
          <p className="text-text-secondary text-sm mt-1">
            {remaining > 0 ? `${remaining.toLocaleString()} kcal left to hit your target.` : "Calorie goal crushed. Recovery mode."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400/10 border border-orange-400/30 rounded-full">
              <span className="text-sm">🔥</span>
              <span className="num font-display font-black text-orange-400 text-sm">{streak}</span>
              <span className="text-orange-400/70 text-xs">day streak</span>
            </div>
          )}
          <Link href="/dashboard/social">
            <UserAvatar src={profile?.avatar_url} size={40} className="ring-2 ring-lime/30" />
          </Link>
        </div>
      </div>

      {/* ── Mobile-only: DailyFact + upgrade ── */}
      <div className="lg:hidden space-y-3 mb-4">
        <DailyFact />
        {UpgradeNudge}
      </div>

      {/* ── Two-column layout ── */}
      <div className="lg:flex lg:gap-5 lg:items-start">

        {/* ════ LEFT COLUMN ════ */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Calorie ring + macros */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ring */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 60%, rgba(52,199,89,0.05) 0%, transparent 70%)" }} />
              <div className="relative w-40 h-40 mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#1a2010" strokeWidth="10" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#34C759" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)", filter: "drop-shadow(0 0 10px rgba(52,199,89,0.5))" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="num font-display font-black text-3xl text-text-primary leading-none">{totalCals.toLocaleString()}</span>
                  <span className="text-text-muted text-xs mt-1">kcal eaten</span>
                </div>
              </div>
              <div className="text-center">
                <p className={`num text-2xl font-display font-bold leading-none ${remaining > 0 ? "text-lime" : "text-orange-400"}`}>
                  {Math.abs(remaining).toLocaleString()}
                </p>
                <p className="text-text-secondary text-sm mt-0.5">{remaining > 0 ? "kcal remaining" : "kcal over goal"}</p>
                <p className="text-text-muted text-xs mt-1">Goal: {targets.calories.toLocaleString()} kcal</p>
              </div>
            </div>

            {/* Macros + protein */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-5">Today's Macros</h3>
                <div className="space-y-4">
                  {MACROS.map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-text-secondary text-sm">{m.label}</span>
                        <span className="num text-text-primary text-sm font-mono">
                          <span style={{ color: m.color }}>{m.current}</span>
                          <span className="text-text-muted">/{m.goal}{m.unit}</span>
                        </span>
                      </div>
                      <div className="macro-bar">
                        <div className="macro-bar-fill" style={{ width: `${Math.min((m.current / m.goal) * 100, 100)}%`, background: m.color, boxShadow: `0 0 8px ${m.color}40` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-5">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#1a2010" strokeWidth="5" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#34C759" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - proteinProgress / 100)}`}
                      style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">💪</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Protein Goal</p>
                  <p className="num font-display font-black text-2xl text-lime leading-none">{Math.round(totalProtein)}g <span className="text-text-muted text-sm font-normal">/ {targets.protein_g}g</span></p>
                  <p className="text-text-secondary text-xs mt-1">
                    {totalProtein >= targets.protein_g ? "✓ Protein goal hit!" : `${targets.protein_g - Math.round(totalProtein)}g left to hit your muscle-building target`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day calorie bars */}
          {weeklyData.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">7-Day Calories</h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime inline-block" />Today</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border inline-block" />Goal</span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-24">
                {weeklyData.map((day) => {
                  const isToday = day.date === todayIso;
                  const pct = day.cals > 0 ? Math.min((day.cals / weeklyMax) * 100, 100) : 0;
                  const goalPct = Math.min((targets.calories / weeklyMax) * 100, 100);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                        <div className="absolute w-full border-t border-dashed border-border/60" style={{ bottom: `${goalPct}%` }} />
                        <div
                          className={`w-full rounded-t-md transition-all duration-700 ${isToday ? "bg-lime" : day.cals > 0 ? "bg-lime/30" : "bg-surface"}`}
                          style={{ height: `${Math.max(pct, day.cals > 0 ? 4 : 0)}%`, boxShadow: isToday ? "0 0 12px rgba(52,199,89,0.3)" : "none" }}
                        />
                      </div>
                      <span className={`text-xs font-mono ${isToday ? "text-lime" : "text-text-muted"}`}>{day.label}</span>
                      {day.cals > 0 && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-1.5 py-0.5 text-xs text-text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {day.cals.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Micronutrients */}
          {(totalFiber > 0 || totalSodium > 0 || totalSugar > 0) && (
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-3">Today's Micronutrients</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Fiber", value: Math.round(totalFiber), unit: "g", goal: 30, color: "#34C759" },
                  { label: "Sugar", value: Math.round(totalSugar), unit: "g", goal: 50, color: "#FF9F0A" },
                  { label: "Sodium", value: Math.round(totalSodium), unit: "mg", goal: 2300, color: totalSodium > 2300 ? "#ef4444" : "#32ADE6" },
                ].map((m) => (
                  <div key={m.label} className="text-center">
                    <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="num font-display font-bold text-lg leading-none" style={{ color: m.color }}>{m.value}<span className="text-text-muted text-xs font-normal ml-0.5">{m.unit}</span></p>
                    <div className="mt-1.5 h-1 bg-canvas rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((m.value / m.goal) * 100, 100)}%`, background: m.color }} />
                    </div>
                    <p className="text-text-muted text-[10px] mt-0.5">/ {m.goal}{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vitamins & Minerals */}
          {hasVitaminData && (
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-4">Vitamins & Minerals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Vitamin C", food: Math.round(totalVitC), supp: Math.round(supplementVitaminBoost.vitamin_c_mg), unit: "mg", dv: 90, color: "#FF9F0A" },
                  { label: "Vitamin D", food: +totalVitD.toFixed(1), supp: +supplementVitaminBoost.vitamin_d_mcg.toFixed(1), unit: "mcg", dv: 20, color: "#34C759" },
                  { label: "Vitamin B12", food: +totalB12.toFixed(1), supp: +supplementVitaminBoost.vitamin_b12_mcg.toFixed(1), unit: "mcg", dv: 2.4, color: "#32ADE6" },
                  { label: "Calcium", food: Math.round(totalCalcium), supp: Math.round(supplementVitaminBoost.calcium_mg), unit: "mg", dv: 1000, color: "#34C759" },
                  { label: "Iron", food: +totalIron.toFixed(1), supp: +supplementVitaminBoost.iron_mg.toFixed(1), unit: "mg", dv: 18, color: "#FF9F0A" },
                  { label: "Potassium", food: Math.round(totalPotassium), supp: Math.round(supplementVitaminBoost.potassium_mg), unit: "mg", dv: 4700, color: "#32ADE6" },
                  { label: "Magnesium", food: Math.round(totalMagnesium), supp: Math.round(supplementVitaminBoost.magnesium_mg), unit: "mg", dv: 420, color: "#34C759" },
                ].map((v) => {
                  const total = v.food + v.supp;
                  const foodPct = Math.min(100, (v.food / v.dv) * 100);
                  const suppPct = Math.min(100 - foodPct, (v.supp / v.dv) * 100);
                  const totalPct = Math.min(100, (total / v.dv) * 100);
                  return (
                    <div key={v.label} className="bg-surface border border-border rounded-xl p-3">
                      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        {v.label}
                        {v.supp > 0 && <span className="text-lime/50" title="Includes supplement contribution">💊</span>}
                      </p>
                      <p className="num font-display font-bold text-base leading-none" style={{ color: v.color }}>
                        {total}<span className="text-text-muted text-[10px] font-normal ml-0.5">{v.unit}</span>
                      </p>
                      <div className="mt-2 h-1 bg-canvas rounded-full overflow-hidden flex">
                        <div className="h-full transition-all" style={{ width: `${foodPct}%`, background: v.color }} />
                        {suppPct > 0 && <div className="h-full transition-all" style={{ width: `${suppPct}%`, background: `${v.color}55` }} />}
                      </div>
                      <p className="text-text-muted text-[10px] mt-1">
                        {Math.round(totalPct)}% DV
                        {v.supp > 0 && <span className="text-text-muted/50 ml-1">(+{v.supp} supp)</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-text-muted text-[10px] mt-3">Food (solid) + supplements (faded). AI estimates from logged meals.</p>
            </div>
          )}

          {/* Today's log — flex-1 so it fills remaining left-column height */}
          <div className="bg-card border border-border rounded-2xl p-6 flex-1">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Today's Log</h3>
              <Link href="/dashboard/calories" className="text-lime text-xs hover:text-lime-glow transition-colors font-mono">+ Add meal</Link>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm">Nothing logged yet today.</p>
                <Link href="/dashboard/calories" className="text-lime text-sm mt-2 inline-block hover:text-lime-glow">Log your first meal →</Link>
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map((meal, i) => (
                  <div key={meal.id} className={`flex items-center gap-4 py-3 ${i < logs.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{meal.name}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {new Date(meal.logged_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}<span className="text-lime/70">{meal.protein_g}g P</span> · {meal.carbs_g}g C · {meal.fat_g}g F
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="num text-text-primary text-sm font-mono">{meal.calories}</span>
                      <span className="text-text-muted text-xs ml-1">kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ════ END LEFT COLUMN ════ */}

        {/* ════ RIGHT COLUMN ════ */}
        <div className="hidden lg:flex lg:flex-col lg:w-[320px] flex-shrink-0 gap-4 mt-0">

          {/* Desktop: DailyFact + upgrade */}
          <DailyFact />
          {UpgradeNudge}

          {/* Water tracking */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💧</span>
                <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Hydration</h3>
              </div>
              <span className="num font-mono text-cyan-app text-sm">{waterGlasses}<span className="text-text-muted text-xs">/{waterGoalGlasses} glasses</span></span>
            </div>
            <div className="h-2 bg-canvas rounded-full overflow-hidden mb-3">
              <div className="h-full bg-cyan-app rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (waterMl / adjustedWaterGoal) * 100)}%`, boxShadow: "0 0 8px rgba(50,173,230,0.4)" }} />
            </div>
            <p className="text-text-muted text-xs mb-1">
              {waterMl >= adjustedWaterGoal ? "✓ Daily goal reached!" : `${adjustedWaterGoal - waterMl}ml left · ${(waterMl / 1000).toFixed(1)}L logged`}
            </p>
            {supplementWaterBonus > 0 && (
              <p className="text-cyan-app/50 text-[10px] mb-3">
                💊 +{supplementWaterBonus}ml for your supplement stack
              </p>
            )}
            {supplementWaterBonus === 0 && <div className="mb-2" />}
            <div className="flex gap-2">
              {[{ label: "+ Glass", ml: 250 }, { label: "+ Bottle", ml: 500 }, { label: "+ Large", ml: 750 }].map(({ label, ml }) => (
                <button key={ml} onClick={() => logWater(ml)}
                  className="flex-1 py-1.5 bg-cyan-app/10 border border-cyan-app/20 rounded-xl text-cyan-app text-xs font-medium hover:bg-cyan-app/20 transition-all">
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="number" min="1" placeholder="Custom ml"
                value={customWaterInput}
                onChange={(e) => setCustomWaterInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { const ml = parseInt(customWaterInput); if (ml > 0) { logWater(ml); setCustomWaterInput(""); } } }}
                className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-cyan-app/50 transition-all num"
              />
              <button
                onClick={() => { const ml = parseInt(customWaterInput); if (ml > 0) { logWater(ml); setCustomWaterInput(""); } }}
                disabled={!customWaterInput || parseInt(customWaterInput) <= 0}
                className="px-3 py-2 bg-cyan-app/20 border border-cyan-app/30 rounded-xl text-cyan-app text-sm font-medium hover:bg-cyan-app/30 transition-all disabled:opacity-40"
              >Log</button>
            </div>
          </div>

          {/* Supplements */}
          {supplements.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💊</span>
                  <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Supplements</h3>
                </div>
                <Link href="/dashboard/settings/supplements" className="text-text-muted text-xs hover:text-text-secondary transition-colors">Manage →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {supplements.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0" />
                    <span className="text-text-secondary text-xs font-medium">{s.name}</span>
                    {s.dose && <span className="text-text-muted text-xs">{s.dose}</span>}
                  </div>
                ))}
              </div>
              {supplementNotes.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {supplementNotes.slice(0, 3).map(({ name, note }) => (
                    <div key={name} className="flex gap-2 px-3 py-2 bg-canvas border border-border rounded-xl">
                      <span className="text-lime text-[10px] font-bold flex-shrink-0 mt-0.5">→</span>
                      <p className="text-text-muted text-[10px] leading-relaxed">
                        <span className="text-text-secondary font-medium">{name}:</span> {note}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} className="bg-surface border border-border rounded-2xl p-4 hover:border-border-bright transition-all group flex flex-col">
                  <span className="text-2xl mb-2 block">{a.icon}</span>
                  <h3 className="font-display font-bold text-text-primary text-xs group-hover:text-lime transition-colors leading-tight">{a.label}</h3>
                  <p className="text-text-muted text-[10px] mt-0.5 leading-tight">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* AI Coach */}
          {showInsights && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-lime animate-pulse-slow" />
                <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">AI Coach</h3>
                <span className="ml-auto text-text-muted text-xs font-mono">7 days</span>
              </div>
              {insightsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}</div>
              ) : insights ? (
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-surface border border-border rounded-xl">
                      <span className="text-base flex-shrink-0">{INSIGHT_ICONS[insight.type] || "⚡"}</span>
                      <div>
                        <p className="text-text-primary text-xs font-medium mb-0.5">{insight.title}</p>
                        <p className="text-text-secondary text-[11px] leading-relaxed">{insight.body}</p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { localStorage.removeItem("forage_insights"); fetchInsights([], onboarding); }}
                    className="text-text-muted text-xs hover:text-text-secondary transition-colors">
                    Refresh insights ↺
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {/* ════ END RIGHT COLUMN ════ */}
      </div>

      {/* ── Mobile-only: Water, supplements, quick actions, AI coach ── */}
      <div className="lg:hidden mt-4 space-y-4">
        {/* Water tracking */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💧</span>
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Hydration</h3>
            </div>
            <span className="num font-mono text-cyan-app text-sm">{waterGlasses}<span className="text-text-muted text-xs">/{waterGoalGlasses} glasses</span></span>
          </div>
          <div className="h-2 bg-canvas rounded-full overflow-hidden mb-3">
            <div className="h-full bg-cyan-app rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (waterMl / adjustedWaterGoal) * 100)}%`, boxShadow: "0 0 8px rgba(50,173,230,0.4)" }} />
          </div>
          <p className="text-text-muted text-xs mb-1">
            {waterMl >= adjustedWaterGoal ? "✓ Daily goal reached! Stay consistent." : `${adjustedWaterGoal - waterMl}ml left · ${(waterMl / 1000).toFixed(1)}L logged`}
          </p>
          {supplementWaterBonus > 0 && (
            <p className="text-cyan-app/50 text-[10px] mb-3">💊 Goal +{supplementWaterBonus}ml for your supplement stack</p>
          )}
          {supplementWaterBonus === 0 && <div className="mb-3" />}
          <div className="flex gap-2 flex-wrap">
            {[{ label: "+ Glass", ml: 250 }, { label: "+ Bottle", ml: 500 }, { label: "+ Large", ml: 750 }].map(({ label, ml }) => (
              <button key={ml} onClick={() => logWater(ml)}
                className="flex-1 min-w-0 py-2 bg-cyan-app/10 border border-cyan-app/20 rounded-xl text-cyan-app text-xs font-medium hover:bg-cyan-app/20 transition-all">
                {label} <span className="text-cyan-app/60">{ml}ml</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="number" min="1" placeholder="Custom amount (ml)"
              value={customWaterInput}
              onChange={(e) => setCustomWaterInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { const ml = parseInt(customWaterInput); if (ml > 0) { logWater(ml); setCustomWaterInput(""); } } }}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-cyan-app/50 transition-all num"
            />
            <button
              onClick={() => { const ml = parseInt(customWaterInput); if (ml > 0) { logWater(ml); setCustomWaterInput(""); } }}
              disabled={!customWaterInput || parseInt(customWaterInput) <= 0}
              className="px-4 py-2 bg-cyan-app/20 border border-cyan-app/30 rounded-xl text-cyan-app text-sm font-medium hover:bg-cyan-app/30 transition-all disabled:opacity-40"
            >Log</button>
          </div>
        </div>

        {/* Supplements */}
        {supplements.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💊</span>
                <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">Today&apos;s Supplements</h3>
              </div>
              <Link href="/dashboard/settings/supplements" className="text-text-muted text-xs hover:text-text-secondary transition-colors">Manage →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {supplements.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0" />
                  <span className="text-text-secondary text-xs font-medium">{s.name}</span>
                  {s.dose && <span className="text-text-muted text-xs">{s.dose}</span>}
                  {s.timing !== "any" && <span className="text-text-muted/60 text-[10px]">· {s.timing}</span>}
                </div>
              ))}
            </div>
            {supplementNotes.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {supplementNotes.slice(0, 4).map(({ name, note }) => (
                  <div key={name} className="flex gap-2 px-3 py-2 bg-canvas border border-border rounded-xl">
                    <span className="text-lime text-[10px] font-bold flex-shrink-0 mt-0.5">→</span>
                    <p className="text-text-muted text-[10px] leading-relaxed">
                      <span className="text-text-secondary font-medium">{name}:</span> {note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="bg-card border border-border rounded-2xl p-5 hover:border-border-bright transition-all group">
              <span className="text-3xl mb-3 block">{a.icon}</span>
              <h3 className="font-display font-bold text-text-primary text-sm group-hover:text-lime transition-colors">{a.label}</h3>
              <p className="text-text-muted text-xs mt-1">{a.desc}</p>
            </Link>
          ))}
        </div>

        {/* AI Coach */}
        {showInsights && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-lime animate-pulse-slow" />
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider">AI Coach</h3>
              <span className="ml-auto text-text-muted text-xs font-mono">Last 7 days</span>
            </div>
            {insightsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}</div>
            ) : insights ? (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-surface border border-border rounded-xl">
                    <span className="text-xl flex-shrink-0">{INSIGHT_ICONS[insight.type] || "⚡"}</span>
                    <div>
                      <p className="text-text-primary text-sm font-medium mb-0.5">{insight.title}</p>
                      <p className="text-text-secondary text-xs leading-relaxed">{insight.body}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => { localStorage.removeItem("forage_insights"); fetchInsights([], onboarding); }}
                  className="text-text-muted text-xs hover:text-text-secondary transition-colors mt-1">
                  Refresh insights ↺
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
