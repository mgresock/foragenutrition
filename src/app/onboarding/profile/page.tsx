"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

type Unit = "imperial" | "metric";

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

    const { error } = await supabase.from("onboarding").upsert({
      user_id: user.id,
      age: parseInt(age),
      sex,
      height_cm: toHeightCm(),
      weight_kg: toWeightKg(),
      unit_pref: unit,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/onboarding/location");
  };

  const isValid = age && (unit === "imperial" ? heightFt : heightCm) && weight && sex;

  return (
    <OnboardingShell step={1} totalSteps={4} title="Tell us about yourself." subtitle="We use this to calculate your personal nutrition targets and caloric needs.">
      <div className="space-y-5">
        <div className="flex bg-surface border border-border rounded-xl p-1 w-fit">
          {(["imperial", "metric"] as Unit[]).map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${unit === u ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
              {u}
            </button>
          ))}
        </div>

        <Field label="Age" hint="years">
          <NumberInput value={age} onChange={setAge} placeholder="25" min={10} max={100} />
        </Field>

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

        <Field label="Weight">
          <NumberInput value={weight} onChange={setWeight} placeholder={unit === "imperial" ? "170" : "77"} min={50} max={600} suffix={unit === "imperial" ? "lbs" : "kg"} />
        </Field>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleNext} disabled={!isValid || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />Saving...</> : "Continue →"}
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
