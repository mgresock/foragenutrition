"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

type Unit = "imperial" | "metric";

const PRIMARY_GOALS = [
  {
    id: "gain",
    emoji: "💪",
    label: "Gain Weight",
    sub: "Build muscle & size",
    color: "lime" as const,
  },
  {
    id: "lose",
    emoji: "🔥",
    label: "Lose Weight",
    sub: "Burn fat, stay lean",
    color: "orange" as const,
  },
  {
    id: "maintain",
    emoji: "⚖️",
    label: "Maintain",
    sub: "Stay where I am",
    color: "cyan" as const,
  },
];

const GOAL_STYLES: Record<string, { selected: string; dot: string }> = {
  lime:   { selected: "border-lime/50 bg-lime/10",           dot: "bg-lime" },
  orange: { selected: "border-orange-400/50 bg-orange-400/10", dot: "bg-orange-400" },
  cyan:   { selected: "border-cyan-app/50 bg-cyan-app/10",   dot: "bg-cyan-app" },
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [unit, setUnit] = useState<Unit>("imperial");
  const [age, setAge] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toHeightCm = () => {
    if (unit === "metric") return parseFloat(heightCm);
    return Math.round((parseFloat(heightFt) * 30.48) + (parseFloat(heightIn || "0") * 2.54));
  };

  const toWeightKg = () => {
    if (unit === "metric") return parseFloat(weight);
    return Math.round(parseFloat(weight) * 0.453592 * 10) / 10;
  };

  const handleNext = async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const [{ error: onboardErr }, { error: profileErr }] = await Promise.all([
      supabase.from("onboarding").upsert({
        user_id: user.id,
        age: parseInt(age),
        sex,
        height_cm: toHeightCm(),
        weight_kg: toWeightKg(),
        unit_pref: unit,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }),
      supabase.from("profiles").upsert({
        id: user.id,
        goal: primaryGoal,
        age: parseInt(age),
        biological_sex: sex,
        height_cm: toHeightCm(),
        weight_kg: toWeightKg(),
      }, { onConflict: "id" }),
    ]);

    const err = onboardErr || profileErr;
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/onboarding/location");
  };

  const isValid = age && (unit === "imperial" ? heightFt : heightCm) && weight && sex && primaryGoal;

  return (
    <OnboardingShell step={1} totalSteps={4} title="Tell us about yourself." subtitle="We use this to calculate your personal calorie targets, macros, and nutrition plan.">
      <div className="space-y-6">

        {/* Unit toggle */}
        <div className="flex bg-surface border border-border rounded-xl p-1 w-fit">
          {(["imperial", "metric"] as Unit[]).map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${unit === u ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
              {u}
            </button>
          ))}
        </div>

        {/* Age */}
        <Field label="Age" hint="years">
          <NumberInput value={age} onChange={setAge} placeholder="25" min={10} max={100} />
        </Field>

        {/* Sex */}
        <Field label="Biological Sex" hint="used for BMR calculation">
          <div className="flex gap-3 flex-wrap">
            {["Male", "Female", "Prefer not to say"].map((s) => (
              <button key={s} onClick={() => setSex(s)}
                className={`px-4 py-2.5 rounded-xl text-sm border transition-all ${sex === s ? "bg-lime/10 border-lime/40 text-lime font-medium" : "bg-surface border-border text-text-secondary hover:border-border-bright"}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        {/* Height */}
        <Field label="Height">
          {unit === "imperial" ? (
            <div className="flex gap-3">
              <div className="flex-1"><NumberInput value={heightFt} onChange={setHeightFt} placeholder="5" min={3} max={8} suffix="ft" /></div>
              <div className="flex-1"><NumberInput value={heightIn} onChange={setHeightIn} placeholder="10" min={0} max={11} suffix="in" /></div>
            </div>
          ) : (
            <NumberInput value={heightCm} onChange={setHeightCm} placeholder="178" min={90} max={250} suffix="cm" />
          )}
        </Field>

        {/* Weight */}
        <Field label="Weight">
          <NumberInput value={weight} onChange={setWeight} placeholder={unit === "imperial" ? "170" : "77"} min={50} max={600} suffix={unit === "imperial" ? "lbs" : "kg"} />
        </Field>

        {/* Primary goal — big tappable cards */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Primary Goal</label>
            <span className="text-text-muted text-xs">— we&apos;ll set your calories accordingly</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {PRIMARY_GOALS.map((g) => {
              const selected = primaryGoal === g.id;
              const styles = GOAL_STYLES[g.color];
              return (
                <button
                  key={g.id}
                  onClick={() => setPrimaryGoal(g.id)}
                  className={`relative flex flex-col items-center gap-2 px-3 py-5 rounded-2xl border-2 transition-all duration-200 ${
                    selected ? styles.selected : "bg-surface border-border hover:border-border-bright"
                  }`}
                >
                  {selected && (
                    <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${styles.dot}`} />
                  )}
                  <span className="text-3xl leading-none">{g.emoji}</span>
                  <div className="text-center">
                    <p className={`font-display font-bold text-sm leading-tight ${selected ? (g.color === "lime" ? "text-lime" : g.color === "orange" ? "text-orange-400" : "text-cyan-app") : "text-text-primary"}`}>
                      {g.label}
                    </p>
                    <p className="text-text-muted text-[10px] mt-0.5 leading-tight">{g.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleNext} disabled={!isValid || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><ForageSpinner size={16} onLight />Saving...</> : "Continue →"}
        </button>
      </div>
    </OnboardingShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <label className="text-xs text-text-secondary uppercase tracking-wider">{label}</label>
        {hint && <span className="text-text-muted text-xs">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, min, max, suffix }: { value: string; onChange: (v: string) => void; placeholder: string; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 focus:shadow-lime-sm transition-all num pr-12" />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">{suffix}</span>}
    </div>
  );
}
