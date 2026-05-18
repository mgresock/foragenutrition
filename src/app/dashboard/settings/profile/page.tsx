"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { UserAvatar } from "@/components/ui/UserAvatar";

type Unit = "imperial" | "metric";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [unit, setUnit] = useState<Unit>("imperial");
  const [age, setAge] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (prof) {
        setDisplayName(prof.display_name || "");
        setAvatarUrl(prof.avatar_url || null);
      }

      const { data } = await supabase.from("onboarding").select("age, sex, height_cm, weight_kg, unit_pref").eq("user_id", user.id).single();
      if (data) {
        setAge(data.age?.toString() || "");
        setSex(data.sex || "");
        const u: Unit = data.unit_pref === "metric" ? "metric" : "imperial";
        setUnit(u);
        if (u === "metric") {
          setHeightCm(data.height_cm?.toString() || "");
          setWeight(data.weight_kg?.toString() || "");
        } else {
          if (data.height_cm) {
            const totalIn = data.height_cm / 2.54;
            setHeightFt(Math.floor(totalIn / 12).toString());
            setHeightIn(Math.round(totalIn % 12).toString());
          }
          setWeight(data.weight_kg ? Math.round(data.weight_kg / 0.453592).toString() : "");
        }
      }
      setFetching(false);
    };
    load();
  }, []);

  const toHeightCm = () => {
    if (unit === "metric") return parseFloat(heightCm);
    return Math.round((parseFloat(heightFt) * 30.48) + (parseFloat(heightIn || "0") * 2.54));
  };

  const toWeightKg = () => {
    if (unit === "metric") return parseFloat(weight);
    return Math.round(parseFloat(weight) * 0.453592 * 10) / 10;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    setError("");

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setError("Avatar upload failed: " + upErr.message); setAvatarUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (profErr) { setError("Profile update failed: " + profErr.message); }
    else { setAvatarUrl(publicUrl); }
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    // Update display_name in profiles
    if (displayName.trim()) {
      await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
    }

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
    setSaved(true);
    setLoading(false);
  };

  const isValid = age && (unit === "imperial" ? heightFt : heightCm) && weight && sex;

  if (fetching) return <div className="px-6 py-8 text-text-muted text-sm">Loading...</div>;

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-lg">
      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors mb-4 inline-block">← Settings</Link>
        <h1 className="font-display font-black text-3xl text-text-primary">Body Stats</h1>
        <p className="text-text-secondary mt-1">Update your stats to keep your calorie targets accurate.</p>
      </div>

      <div className="space-y-5">
        {/* Avatar upload */}
        <div className="flex items-center gap-5 p-4 bg-card border border-border rounded-2xl">
          <button onClick={() => fileInputRef.current?.click()} className="relative flex-shrink-0 group">
            <UserAvatar src={avatarUrl} size={80} className="ring-4 ring-border group-hover:ring-lime/30 transition-all" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 20 20">
                <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <ForageSpinner size={20} onLight />
              </div>
            )}
          </button>
          <div>
            <div className="text-text-primary font-medium text-sm">Profile Photo</div>
            <div className="text-text-muted text-xs mt-0.5">Click to upload a new photo</div>
            <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs text-lime hover:underline">Change photo</button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Display name */}
        <Field label="Display Name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
          />
        </Field>

        <div className="flex bg-surface border border-border rounded-xl p-1 w-fit">
          {(["imperial", "metric"] as Unit[]).map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${unit === u ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
              {u}
            </button>
          ))}
        </div>

        <Field label="Age" hint="years">
          <NumberInput value={age} onChange={setAge} placeholder="25" suffix="yrs" />
        </Field>

        <Field label="Biological Sex">
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
              <div className="flex-1"><NumberInput value={heightFt} onChange={setHeightFt} placeholder="5" suffix="ft" /></div>
              <div className="flex-1"><NumberInput value={heightIn} onChange={setHeightIn} placeholder="10" suffix="in" /></div>
            </div>
          ) : (
            <NumberInput value={heightCm} onChange={setHeightCm} placeholder="178" suffix="cm" />
          )}
        </Field>

        <Field label="Weight">
          <NumberInput value={weight} onChange={setWeight} placeholder={unit === "imperial" ? "170" : "77"} suffix={unit === "imperial" ? "lbs" : "kg"} />
        </Field>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}
        {saved && <p className="text-lime text-sm bg-lime/10 border border-lime/20 rounded-lg px-4 py-2">Saved successfully.</p>}

        <button onClick={handleSave} disabled={!isValid || loading}
          className="w-full bg-lime text-canvas font-display font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><ForageSpinner size={16} onLight />Saving...</> : "Save Changes"}
        </button>
      </div>
    </div>
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

function NumberInput({ value, onChange, placeholder, suffix }: { value: string; onChange: (v: string) => void; placeholder: string; suffix?: string }) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all num pr-12" />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">{suffix}</span>}
    </div>
  );
}
