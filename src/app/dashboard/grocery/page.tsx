"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { fetchNearbyStores, type NearbyStore } from "@/lib/overpass";

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  estimatedPrice: number;
  store: string;
  category: string;
  checked: boolean;
  protein?: number;
  reason?: string;
}

interface AiItem {
  name: string;
  quantity: string;
  estimatedPrice?: number;
  estimated_price?: number;
  store: string;
  category: string;
  protein?: number;
  reason?: string;
}

interface MealDay {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snack?: string;
  approx_calories: number;
  approx_protein_g: number;
}

const CATEGORIES = ["All", "Protein", "Carbs", "Produce", "Dairy", "Fats", "Other"];

function ManualStoreInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add a store manually (e.g. Wegmans, Costco…)"
        className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary placeholder-text-muted text-xs focus:outline-none focus:border-lime/50 transition-all"
      />
      <button
        onClick={submit}
        disabled={!val.trim()}
        className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-lime hover:border-lime/40 transition-all disabled:opacity-40"
      >+ Add</button>
    </div>
  );
}

// Deterministic color from store name so each store always gets the same color
function storeColor(name: string): string {
  const colors = [
    "text-cyan-app border-cyan-app/30 bg-cyan-app/10",
    "text-amber-app border-amber-app/30 bg-amber-app/10",
    "text-lime border-lime/30 bg-lime/10",
    "text-violet-400 border-violet-400/30 bg-violet-400/10",
    "text-pink-400 border-pink-400/30 bg-pink-400/10",
    "text-orange-400 border-orange-400/30 bg-orange-400/10",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

export default function GroceryPage() {
  const supabase = createClient();
  const [listId, setListId] = useState<string | null>(null);
  const [list, setList] = useState<GroceryItem[]>([]);
  const [recipeUrl, setRecipeUrl] = useState("");
  const [recipeImporting, setRecipeImporting] = useState(false);
  const [recipeMsg, setRecipeMsg] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Store finder
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [manualStores, setManualStores] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storesError, setStoresError] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [showAllStores, setShowAllStores] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  // Meal plan
  const [mealPlan, setMealPlan] = useState<MealDay[]>([]);
  const [mealPlanOpen, setMealPlanOpen] = useState(true);

  // Copy feedback
  const [copiedList, setCopiedList] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Chat
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hey! Select your local stores above, then hit Generate — I'll build a list split across exactly those stores, optimized for your goals." },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadList(); loadZip(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  // Only pre-fill the saved ZIP — do NOT auto-fetch stores. User must press Go or My Location.
  const loadZip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ob } = await supabase
      .from("onboarding").select("zip_code").eq("user_id", user.id).single();
    const zip = ob?.zip_code;
    if (zip) setZipCode(zip);
  };

  const fetchStores = async (zip: string, coords?: { lat: number; lng: number }) => {
    if (!coords && !zip?.trim()) return;
    setLoadingStores(true);
    setStoresError("");
    setNearbyStores([]);
    try {
      let lat: number, lng: number;
      if (coords) {
        lat = coords.lat; lng = coords.lng;
      } else {
        // Geocode ZIP via lightweight server route (just Nominatim, no Overpass)
        const res = await fetch(`/api/geocode?zip=${encodeURIComponent(zip.trim())}`);
        const geo = await res.json();
        if (!geo.lat) { setStoresError(geo.error || "Could not find that ZIP code."); setLoadingStores(false); return; }
        lat = geo.lat; lng = geo.lng;
      }
      // Call Overpass directly from the browser — avoids server-side fetch issues
      const stores = await fetchNearbyStores(lat, lng);
      if (stores.length > 0) {
        setNearbyStores(stores);
      } else {
        setStoresError("No grocery stores found nearby. Add stores manually below.");
      }
    } catch {
      setStoresError("Could not reach map data. Add stores manually below.");
    }
    setLoadingStores(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStoresError("Geolocation not supported. Enter a ZIP code instead.");
      return;
    }
    setGeoLocating(true);
    setStoresError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        fetchStores("", { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeoLocating(false);
        setStoresError("Location access denied. Enter a ZIP code instead.");
      },
      { timeout: 10000 }
    );
  };

  const toggleStore = (name: string) => {
    setSelectedStores((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  // Import a recipe from a URL → append its ingredients to the grocery list.
  const importRecipe = async () => {
    if (!recipeUrl.trim()) return;
    setRecipeImporting(true); setRecipeMsg("");
    try {
      const res = await fetch("/api/recipe-import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRecipeMsg(data.error || "Import failed."); return; }
      const ings: { item: string; quantity: string }[] = data.ingredients ?? [];
      const newItems: GroceryItem[] = ings.map((ing, i) => ({
        id: `recipe-${Date.now()}-${i}`, name: ing.item, quantity: ing.quantity || "",
        estimatedPrice: 0, store: "", category: "Other", checked: false,
      }));
      setList((prev) => [...prev, ...newItems]);
      setRecipeMsg(`Added ${newItems.length} ingredients from “${data.title}”.`);
      setRecipeUrl("");
    } catch { setRecipeMsg("Import failed."); }
    finally { setRecipeImporting(false); }
  };

  const addManualStore = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    if (!manualStores.includes(trimmed)) setManualStores((p) => [...p, trimmed]);
    if (!selectedStores.includes(trimmed)) setSelectedStores((p) => [...p, trimmed]);
  };

  const removeManualStore = (name: string) => {
    setManualStores((p) => p.filter((s) => s !== name));
    setSelectedStores((p) => p.filter((s) => s !== name));
  };

  const loadList = async () => {
    setLoadingList(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingList(false); return; }

    const { data: lists } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lists && lists.length > 0) {
      const lid = lists[0].id;
      setListId(lid);
      const { data: items } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("list_id", lid)
        .order("created_at", { ascending: true });

      if (items) {
        setList(items.map((i) => ({
          id: i.id, name: i.name, quantity: i.quantity || "",
          estimatedPrice: i.estimated_price, store: i.store || "",
          category: i.category || "Other", checked: i.checked,
          protein: i.protein_g, reason: i.reason,
        })));
        setChatMessages([{ role: "ai", text: `Your saved grocery list is loaded — ${items.length} items. Want me to swap anything, adjust for a new goal, or regenerate from scratch?` }]);
      }
    }
    setLoadingList(false);
  };

  const copyList = () => {
    const categories = ["Protein", "Carbs", "Produce", "Dairy", "Fats", "Other"];
    const lines = [`GROCERY LIST — $${totalCost.toFixed(2)} total\n`];
    for (const cat of categories) {
      const items = list.filter((i) => i.category === cat);
      if (!items.length) continue;
      lines.push(cat.toUpperCase());
      for (const item of items) {
        const store = item.store ? ` (${item.store})` : "";
        lines.push(`• ${item.name} × ${item.quantity} — $${item.estimatedPrice.toFixed(2)}${store}`);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2000);
  };

  const copyPlan = () => {
    const lines = ["7-DAY MEAL PLAN\n"];
    for (const day of mealPlan) {
      lines.push(`${day.day.toUpperCase()} (~${day.approx_calories} cal · ${day.approx_protein_g}g protein)`);
      lines.push(`  Breakfast: ${day.breakfast}`);
      lines.push(`  Lunch: ${day.lunch}`);
      lines.push(`  Dinner: ${day.dinner}`);
      if (day.snack) lines.push(`  Snack: ${day.snack}`);
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  const generateList = async (regenerate = false) => {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGenerating(false); return; }

    const { data: onboardingRaw } = await supabase
      .from("onboarding")
      .select("goals, meals_per_week, zip_code, weekly_budget, weight_kg")
      .eq("user_id", user.id)
      .single();
    const onboarding = { ...onboardingRaw };

    const res = await fetch("/api/grocery-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        userProfile: onboarding,
        selectedStores,
      }),
    });
    const data = await res.json();

    if (data.error) {
      setChatMessages([{ role: "ai", text: `Something went wrong: ${data.error}. Try again.` }]);
      setGenerating(false);
      return;
    }

    if (data.meal_plan?.length) setMealPlan(data.meal_plan);

    if (data.items?.length) {
      // Render immediately from AI response — don't block on DB save
      const aiItems: GroceryItem[] = data.items.map((item: AiItem, idx: number) => ({
        id: `ai-${idx}`,
        name: item.name,
        quantity: item.quantity || "",
        estimatedPrice: item.estimatedPrice ?? item.estimated_price ?? 0,
        store: item.store || "",
        category: item.category || "Other",
        checked: false,
        protein: item.protein ?? undefined,
        reason: item.reason ?? undefined,
      }));
      setList(aiItems);
      setFilter("All");
      setMealPlanOpen(true);
      const storeNote = selectedStores.length > 0 ? ` across ${selectedStores.join(", ")}` : "";
      const budget = onboarding?.weekly_budget ? ` under your $${onboarding.weekly_budget} budget` : "";
      setChatMessages([{ role: "ai", text: `Done! ${aiItems.length}-item list built${storeNote}${budget}. Your 7-day meal plan is above. Want me to swap anything or adjust for your goals?` }]);

      // Try to persist to DB in the background (tables may not exist yet)
      try {
        if (regenerate && listId) {
          await supabase.from("grocery_lists").delete().eq("id", listId);
        }
        const { data: newList } = await supabase
          .from("grocery_lists")
          .insert({ user_id: user.id, name: "Weekly Grocery List" })
          .select()
          .single();
        if (newList) {
          setListId(newList.id);
          const { data: inserted } = await supabase
            .from("grocery_items")
            .insert(aiItems.map((item) => ({
              list_id: newList.id,
              name: item.name,
              quantity: item.quantity,
              estimated_price: item.estimatedPrice,
              store: item.store,
              category: item.category,
              checked: false,
              protein_g: item.protein ?? null,
              reason: item.reason ?? null,
            })))
            .select();
          if (inserted) {
            // Update local IDs to real DB IDs so toggle/remove work
            setList(inserted.map((i) => ({
              id: i.id, name: i.name, quantity: i.quantity || "",
              estimatedPrice: i.estimated_price, store: i.store || "",
              category: i.category || "Other", checked: i.checked,
              protein: i.protein_g, reason: i.reason,
            })));
          }
        }
      } catch {
        // DB tables may not exist — items already displayed from state, continue
      }
    }
    setGenerating(false);
  };

  const toggleItem = async (id: string) => {
    const item = list.find((i) => i.id === id);
    if (!item) return;
    const newChecked = !item.checked;
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, checked: newChecked } : i)));
    await supabase.from("grocery_items").update({ checked: newChecked }).eq("id", id);
  };

  const removeItem = async (id: string) => {
    setList((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("grocery_items").delete().eq("id", id);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim()) return;
    const msg = inputMsg.trim();
    setInputMsg("");
    const newMessages: { role: "user" | "ai"; text: string }[] = [...chatMessages, { role: "user", text: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    let onboarding = null;
    if (user) {
      const { data: ob } = await supabase
        .from("onboarding")
        .select("goals, meals_per_week, zip_code, weekly_budget")
        .eq("user_id", user.id)
        .single();
      onboarding = { ...ob };
    }

    const res = await fetch("/api/grocery-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        messages: newMessages,
        userProfile: onboarding,
        selectedStores,
        currentList: list.map((i) => ({ name: i.name, category: i.category, store: i.store, estimatedPrice: i.estimatedPrice })),
      }),
    });
    const data = await res.json();
    setChatMessages((prev) => [...prev, { role: "ai", text: data.reply || "Something went wrong, try again." }]);
    setChatLoading(false);
  };

  const filtered = list.filter(
    (i) => (filter === "All" || i.category === filter) && i.name.toLowerCase().includes(query.toLowerCase())
  );

  const totalCost = list.reduce((s, i) => s + i.estimatedPrice, 0);
  const checkedCost = list.filter((i) => i.checked).reduce((s, i) => s + i.estimatedPrice, 0);
  const checkedCount = list.filter((i) => i.checked).length;

  const byStore = list.reduce((acc, item) => {
    if (item.store) acc[item.store] = (acc[item.store] || 0) + item.estimatedPrice;
    return acc;
  }, {} as Record<string, number>);

  const visibleStores = showAllStores ? nearbyStores : nearbyStores.slice(0, 8);

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-5xl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-black text-3xl text-text-primary">Grocery AI</h1>
            <span className="px-2 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-xs font-mono">AI</span>
          </div>
          <p className="text-text-secondary">Pick your stores, then let AI build the list.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => generateList(list.length > 0)}
            disabled={generating || loadingList || selectedStores.length === 0}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <><ForageSpinner size={14} onLight />Building...</>
            ) : list.length > 0 ? "↺ Regenerate" : "✦ Generate My List"}
          </button>
          {selectedStores.length === 0 && !generating && (
            <p className="text-text-muted text-xs">Select a store first</p>
          )}
        </div>
      </div>

      {/* Store finder */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-lime" fill="none" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 100 12A6 6 0 0010 2z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 14v4M7 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-text-primary font-medium text-sm">Nearby Stores</span>
            {selectedStores.length > 0 && (
              <span className="px-2 py-0.5 bg-lime/10 border border-lime/30 rounded-full text-lime text-xs font-mono">
                {selectedStores.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={useMyLocation}
              disabled={loadingStores || geoLocating}
              title="Use my current location"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-lime text-canvas font-bold text-xs rounded-lg hover:bg-lime-glow transition-all disabled:opacity-40 flex-shrink-0"
            >
              {geoLocating
                ? <ForageSpinner size={12} onLight />
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" fill="currentColor"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/></svg>
              }
              <span className="hidden sm:inline">{geoLocating ? "Locating…" : "My Location"}</span>
            </button>
            <input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchStores(zipCode)}
              placeholder="or ZIP"
              maxLength={5}
              className="w-20 bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary placeholder-text-muted text-xs font-mono focus:outline-none focus:border-lime/50 transition-all"
            />
            <button
              onClick={() => fetchStores(zipCode)}
              disabled={loadingStores || !zipCode.trim()}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-lime/40 transition-all disabled:opacity-40"
            >
              {loadingStores && !geoLocating ? (
                <ForageSpinner size={12} />
              ) : "Go"}
            </button>
          </div>
        </div>

        {storesError && (
          <p className="text-amber-app text-xs mb-3">{storesError}</p>
        )}

        {loadingStores && (
          <div className="flex items-center gap-3 py-3 text-text-muted text-sm">
            <ForageSpinner size={16} />
            Searching for nearby stores...
          </div>
        )}

        {!loadingStores && nearbyStores.length > 0 && (
          <>
            <p className="text-text-muted text-xs mb-2">
              {nearbyStores.length} stores found nearby · tap to select
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {visibleStores.map((store) => {
                const selected = selectedStores.includes(store.name);
                return (
                  <button
                    key={store.name}
                    onClick={() => toggleStore(store.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                      selected
                        ? "bg-lime/10 border-lime/40 text-lime"
                        : "bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary"
                    }`}
                  >
                    {selected && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 14 14">
                        <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className="font-medium">{store.name}</span>
                    <span className="text-xs opacity-60">{store.distanceMiles} mi</span>
                  </button>
                );
              })}
              {nearbyStores.length > 8 && (
                <button
                  onClick={() => setShowAllStores((v) => !v)}
                  className="px-3 py-2 rounded-xl border border-dashed border-border text-text-muted text-sm hover:border-border-bright hover:text-text-secondary transition-all"
                >
                  {showAllStores ? "Show less" : `+${nearbyStores.length - 8} more`}
                </button>
              )}
            </div>
          </>
        )}

        {!loadingStores && nearbyStores.length === 0 && !storesError && (
          <p className="text-text-muted text-xs mb-3">Enter your ZIP to find nearby stores, or add them manually below.</p>
        )}

        {/* Manual stores — always visible */}
        {manualStores.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {manualStores.map((name) => {
              const selected = selectedStores.includes(name);
              return (
                <div key={name} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${selected ? "bg-lime/10 border-lime/40 text-lime" : "bg-surface border-border text-text-secondary"}`}>
                  <button onClick={() => toggleStore(name)} className="flex items-center gap-1.5">
                    {selected && <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 14 14"><path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    <span className="text-text-muted text-[10px] mr-0.5">📍</span>
                    <span className="font-medium">{name}</span>
                  </button>
                  <button onClick={() => removeManualStore(name)} className="text-text-muted/50 hover:text-red-400 transition-colors ml-1 text-xs">✕</button>
                </div>
              );
            })}
          </div>
        )}

        <ManualStoreInput onAdd={addManualStore} />

        {selectedStores.length === 0 && !loadingStores && (
          <p className="text-text-muted text-xs mt-2 italic">No stores selected — AI will pick stores for your area.</p>
        )}

        {/* Recipe import */}
        <div className="mt-4 pt-4 border-t border-border">
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Import from a recipe URL</label>
          <div className="flex gap-2">
            <input type="url" value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") importRecipe(); }}
              placeholder="https://… paste a recipe link"
              className="flex-1 min-w-0 bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50" />
            <button onClick={importRecipe} disabled={recipeImporting || !recipeUrl.trim()}
              className="px-4 bg-lime/15 border border-lime/30 text-lime rounded-xl text-sm font-medium hover:bg-lime/25 transition-all disabled:opacity-40 whitespace-nowrap">
              {recipeImporting ? "Importing…" : "Import"}
            </button>
          </div>
          {recipeMsg && <p className="text-text-muted text-xs mt-2">{recipeMsg}</p>}
        </div>
      </div>

      {/* Meal Plan */}
      {mealPlan.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 hover:bg-surface/50 transition-all">
            <button
              onClick={() => setMealPlanOpen((v) => !v)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <span className="font-display font-bold text-text-primary text-sm">7-Day Meal Plan</span>
              <span className="text-text-muted text-xs font-mono">
                ~{Math.round(mealPlan.reduce((s, d) => s + d.approx_protein_g, 0) / mealPlan.length)}g protein/day avg
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={copyPlan}
                className="px-2.5 py-1 rounded-lg border border-border text-text-muted hover:text-lime hover:border-lime/40 text-xs transition-all"
              >
                {copiedPlan ? "✓ Copied" : "Copy"}
              </button>
              <button onClick={() => setMealPlanOpen((v) => !v)} className="text-text-muted text-xs">
                <span className={`inline-block transition-transform ${mealPlanOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
            </div>
          </div>
          {mealPlanOpen && (
            <div className="border-t border-border overflow-x-auto">
              <div className="flex gap-0 min-w-max">
                {mealPlan.map((day, i) => (
                  <div key={i} className={`flex-shrink-0 w-44 p-4 ${i < mealPlan.length - 1 ? "border-r border-border" : ""}`}>
                    <p className="font-display font-bold text-lime text-xs uppercase tracking-wider mb-3">{day.day}</p>
                    <div className="space-y-2.5">
                      {[
                        { label: "AM", meal: day.breakfast },
                        { label: "Lunch", meal: day.lunch },
                        { label: "PM", meal: day.dinner },
                        ...(day.snack ? [{ label: "Snack", meal: day.snack }] : []),
                      ].map(({ label, meal }) => (
                        <div key={label}>
                          <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-text-secondary text-xs leading-snug">{meal}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex gap-3">
                      <div>
                        <p className="text-text-muted text-[9px] uppercase">Cal</p>
                        <p className="num font-mono text-xs text-text-secondary">{day.approx_calories}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[9px] uppercase">Pro</p>
                        <p className="num font-mono text-xs text-lime">{day.approx_protein_g}g</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loadingList ? (
        <div className="flex items-center justify-center py-24 text-text-muted text-sm">Loading your list...</div>
      ) : generating ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ForageSpinner size={20} />
            <span className="text-text-secondary text-sm font-medium">Building your meal plan + grocery list…</span>
          </div>
          <p className="text-text-muted text-xs">Planning 7 days of meals and the exact items to buy. This takes ~10 seconds.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-surface border border-border rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-lime/10 border border-lime/20 flex items-center justify-center text-4xl animate-pulse-slow">🛒</div>
          <h3 className="font-display font-bold text-text-primary text-xl mb-2">Let&apos;s build your week.</h3>
          <p className="text-text-secondary text-sm mb-5 max-w-sm mx-auto">
            {selectedStores.length > 0
              ? `Ready to build a high-protein, on-budget list for ${selectedStores.join(", ")}.`
              : "Pick your local stores above, or hit Generate and AI plans 7 days of meals + the exact items to buy."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-7 text-xs">
            {[{ i: "💪", t: "High-protein" }, { i: "💸", t: "On budget" }, { i: "🗓️", t: "7-day plan" }].map((b) => (
              <span key={b.t} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-text-secondary">{b.i} {b.t}</span>
            ))}
          </div>
          <button
            onClick={() => generateList(false)}
            className="px-6 py-3.5 bg-lime text-canvas font-display font-bold rounded-xl uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm"
          >
            ✦ Generate My List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* List panel */}
          <div className="lg:col-span-3 space-y-4">
            {/* Cost + store breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Total Est.</p>
                <p className="num font-display font-black text-2xl text-lime">${totalCost.toFixed(2)}</p>
              </div>
              {Object.entries(byStore).slice(0, 2).map(([store, cost]) => (
                <div key={store} className={`rounded-xl p-4 border ${storeColor(store)}`}>
                  <p className="text-xs uppercase tracking-wider mb-1 opacity-70 truncate">{store}</p>
                  <p className="num font-display font-black text-2xl">${cost.toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Store split (if >2 stores) */}
            {Object.keys(byStore).length > 2 && (
              <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap gap-3">
                {Object.entries(byStore).map(([store, cost]) => (
                  <div key={store} className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${storeColor(store)}`}>{store}</span>
                    <span className="num text-text-secondary text-xs font-mono">${cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {checkedCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-lime/5 border border-lime/20 rounded-xl">
                <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${(checkedCount / list.length) * 100}%` }} />
                </div>
                <span className="text-lime text-xs font-mono flex-shrink-0">{checkedCount}/{list.length} · ${checkedCost.toFixed(2)} in cart</span>
              </div>
            )}

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.filter((cat) => cat === "All" || list.some((i) => i.category === cat)).map((cat) => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === cat ? "bg-lime/10 border border-lime/40 text-lime" : "bg-surface border border-border text-text-muted hover:border-border-bright hover:text-text-secondary"}`}>
                  {cat}
                </button>
              ))}
              <button
                onClick={copyList}
                className="ml-auto px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-lime hover:border-lime/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                {copiedList ? (
                  <><span>✓</span> Copied!</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> Copy List</>
                )}
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">No items match your filter.</div>
              ) : filtered.map((item, i) => (
                <div key={item.id}
                  className={`flex items-start gap-3 p-4 group transition-all ${i < filtered.length - 1 ? "border-b border-border" : ""} ${item.checked ? "opacity-40" : ""}`}>
                  <button onClick={() => toggleItem(item.id)}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${item.checked ? "bg-lime border-lime" : "border-border hover:border-lime/50"}`}>
                    {item.checked && (
                      <svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${item.checked ? "line-through text-text-muted" : "text-text-primary"}`}>{item.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.quantity && <span className="text-text-muted text-xs">{item.quantity}</span>}
                          {item.store && (
                            <span className={`px-1.5 py-0.5 rounded text-xs border ${storeColor(item.store)}`}>{item.store}</span>
                          )}
                          {item.protein && (
                            <span className="text-lime text-xs font-mono">{item.protein}g protein</span>
                          )}
                        </div>
                        {item.reason && <p className="text-text-muted text-xs mt-1 italic">{item.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="num text-text-primary text-sm font-mono">${item.estimatedPrice.toFixed(2)}</span>
                        <button onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-card border border-border rounded-2xl flex flex-col h-[520px]">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-lime animate-pulse-slow" />
                <span className="text-text-secondary text-sm font-medium">Grocery Assistant</span>
                <span className="ml-auto text-text-muted text-xs font-mono">Forage AI</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed ${msg.role === "user" ? "bg-lime/10 border border-lime/30 text-text-primary" : "bg-surface border border-border text-text-secondary"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-surface border border-border rounded-xl px-4 py-3 flex gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Swap items, adjust budget..."
                    className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
                  />
                  <button onClick={sendMessage} disabled={!inputMsg.trim() || chatLoading}
                    className="px-3 py-2.5 bg-lime rounded-xl text-canvas disabled:opacity-40 transition-all hover:bg-lime-glow">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                      <path d="M2 8h12M8 3l7 5-7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
