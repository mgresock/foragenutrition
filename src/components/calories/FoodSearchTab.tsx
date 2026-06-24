"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ForageSpinner } from "@/components/ui/ForageSpinner";

// Lazy-load the scanner so the heavy @zxing barcode lib only downloads when the
// user actually opens the camera, keeping the calorie page bundle small.
const BarcodeScanner = dynamic(
  () => import("@/components/calories/BarcodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false }
);

interface FoodResult {
  id: string;
  name: string;
  brand: string;
  basis: "serving" | "100g";
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  sodium_mg?: number;
  image?: string;
  grade?: string;
}

export interface FoodLogEntry {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "manual";
  nutrition_meta: Record<string, unknown>;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

interface RecentFood { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }

export function FoodSearchTab({ onLog, saving, recents = [], onRelog }: {
  onLog: (e: FoodLogEntry) => void;
  saving: boolean;
  recents?: RecentFood[];
  onRelog?: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [qty, setQty] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);

  const runSearch = async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true); setError(null); setResults(null); setSelected(null);
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed."); return; }
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError("No matches — try a different term or add it manually.");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };
  const search = () => runSearch(query);

  // Search-as-you-type (debounced) — Open Food Facts results are cached server-side.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || selected) return;
    const t = setTimeout(() => runSearch(q), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // "Find a healthier swap" — re-search the item name to surface higher-protein options.
  const findSwap = (name: string) => { setSelected(null); setResults(null); setQuery(name); };

  const handleBarcode = async (code: string) => {
    setScanning(false);
    if (!code) return;
    setScanLookup(true); setError(null); setResults(null); setSelected(null);
    try {
      const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.status === 404) { setError(`No product found for barcode ${code}. Try searching by name.`); return; }
      if (!res.ok || !data.result) { setError(data.error || "Lookup failed."); return; }
      setSelected(data.result); setQty(1);
    } catch { setError("Lookup failed. Please try again."); }
    finally { setScanLookup(false); }
  };

  const pick = (f: FoodResult) => { setSelected(f); setQty(1); };

  const add = () => {
    if (!selected) return;
    const q = qty > 0 ? qty : 1;
    const scale = (v: number | undefined) => (v == null ? undefined : r1(v * q));
    onLog({
      name: `${selected.brand ? selected.brand + " " : ""}${selected.name}`.slice(0, 120),
      calories: Math.round(selected.calories * q),
      protein_g: r1(selected.protein_g * q),
      carbs_g: r1(selected.carbs_g * q),
      fat_g: r1(selected.fat_g * q),
      source: "manual",
      nutrition_meta: {
        fiber_g: scale(selected.fiber_g),
        sugar_g: scale(selected.sugar_g),
        saturated_fat_g: scale(selected.saturated_fat_g),
        sodium_mg: selected.sodium_mg != null ? Math.round(selected.sodium_mg * q) : undefined,
        source_detail: scanLookup || selected.id.match(/^\d{6,}$/) ? "barcode" : "food_search",
        barcode: selected.id,
        basis: selected.basis,
        servings: q,
        grade: selected.grade,
      },
    });
  };

  const unit = selected ? (selected.basis === "serving" ? (selected.serving_size || "serving") : "100g") : "";

  return (
    <div className="space-y-4">
      {scanning && <BarcodeScanner onDetect={handleBarcode} onClose={() => setScanning(false)} />}

      {/* Search + scan */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex gap-2">
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Search a food — e.g. tortilla chips, greek yogurt"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
          />
          <button onClick={search} disabled={loading || query.trim().length < 2}
            className="px-4 bg-lime text-canvas font-display font-bold rounded-xl text-sm hover:bg-lime-glow transition-all disabled:opacity-40">
            {loading ? <ForageSpinner size={16} onLight /> : "Search"}
          </button>
        </div>
        <button onClick={() => setScanning(true)}
          className="w-full flex items-center justify-center gap-2 bg-surface border border-border hover:border-lime/40 rounded-xl py-2.5 text-text-primary text-sm transition-all">
          <svg className="w-4 h-4 text-lime" fill="none" viewBox="0 0 20 20"><path d="M2 4v12M5 4v12M8 4v12M12 4v12M15 4v12M18 4v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          Scan barcode
        </button>
        <p className="text-text-muted text-[11px] leading-relaxed">Nutrition from Open Food Facts. Per-serving values used when available, otherwise per 100g — adjust the amount below.</p>
      </div>

      {/* Recent foods — one-tap re-log */}
      {!selected && !results && !scanLookup && recents.length > 0 && onRelog && (
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-mono mb-2 px-1">Recent · tap to re-log</p>
          <div className="flex flex-wrap gap-2">
            {recents.map((r, i) => (
              <button key={r.name + i} onClick={() => onRelog(i)} disabled={saving}
                className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 text-left hover:border-lime/40 hover:bg-lime/5 transition-all disabled:opacity-50">
                <span className="text-text-primary text-xs font-medium max-w-[160px] truncate">{r.name}</span>
                <span className="num text-lime text-xs font-display font-bold">{r.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {scanLookup && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4"><ForageSpinner size={18} />Looking up barcode…</div>
      )}
      {error && !selected && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Selected food → quantity + add */}
      {selected && (
        <div className="bg-lime/5 border border-lime/30 rounded-2xl p-5 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {selected.image && <img src={selected.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-text-primary leading-tight">{selected.name}</h3>
              {selected.brand && <p className="text-text-secondary text-xs">{selected.brand}</p>}
              <p className="text-text-muted text-[10px] mt-0.5">per {unit}{selected.grade ? ` · Nutri-Score ${selected.grade.toUpperCase()}` : ""}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary text-sm flex-shrink-0">✕</button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-text-secondary text-xs">Amount</span>
            <button onClick={() => setQty((q) => Math.max(0.25, r1(q - (q <= 1 ? 0.25 : 1))))} className="w-8 h-8 rounded-lg bg-surface border border-border text-text-primary">−</button>
            <input type="number" min={0.25} step={0.25} value={qty}
              onChange={(e) => setQty(Math.max(0.25, Number(e.target.value) || 1))}
              className="w-16 text-center bg-surface border border-border rounded-lg py-1.5 text-text-primary text-sm num" />
            <button onClick={() => setQty((q) => r1(q + (q < 1 ? 0.25 : 1)))} className="w-8 h-8 rounded-lg bg-surface border border-border text-text-primary">+</button>
            <span className="text-text-muted text-xs">× {unit}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Cals", v: Math.round(selected.calories * qty), u: "" },
              { label: "Protein", v: r1(selected.protein_g * qty), u: "g" },
              { label: "Carbs", v: r1(selected.carbs_g * qty), u: "g" },
              { label: "Fat", v: r1(selected.fat_g * qty), u: "g" },
            ].map((m) => (
              <div key={m.label} className="text-center bg-surface border border-border rounded-xl p-2">
                <p className="num font-display font-bold text-text-primary text-lg leading-none">{m.v}{m.u}</p>
                <p className="text-text-muted text-[10px] mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Healthier-swap nudge for low Nutri-Score products */}
          {selected.grade && /[de]/i.test(selected.grade) && (
            <button onClick={() => findSwap(selected.name.replace(/\b(original|classic|regular)\b/gi, "").trim())}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-amber-app/10 border border-amber-app/30 text-amber-app rounded-xl py-2.5 text-sm transition-all hover:bg-amber-app/15">
              Nutri-Score {selected.grade.toUpperCase()} — find a higher-protein swap
            </button>
          )}

          <button onClick={add} disabled={saving}
            className="w-full bg-lime text-canvas font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all disabled:opacity-50">
            {saving ? "Saving…" : "Add to Log"}
          </button>
        </div>
      )}

      {/* Results list */}
      {results && results.length > 0 && !selected && (
        <div className="space-y-2">
          {results.map((f) => (
            <button key={f.id + f.name} onClick={() => pick(f)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left hover:border-lime/30 hover:bg-lime/5 transition-all">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.image
                ? <img src={f.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-surface border border-border flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium truncate leading-tight">{f.name}</p>
                <p className="text-text-muted text-xs truncate">{f.brand || "Generic"} · per {f.basis === "serving" ? (f.serving_size || "serving") : "100g"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="num font-display font-bold text-text-primary text-base leading-none">{f.calories}</p>
                <p className="text-text-muted text-[10px]">kcal</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
