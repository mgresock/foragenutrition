"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { fetchNearbyRestaurants, type NearbyRestaurant } from "@/lib/overpass";
import Link from "next/link";

interface MenuItem {
  name: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  price: number;
  customization: string;
  why: string;
}

interface RestaurantResult {
  restaurant_name: string;
  confidence: "high" | "medium" | "low";
  data_source: "web_fetch" | "user_provided" | "training_data";
  items: MenuItem[];
  tips: string[];
  avoid: string[];
  menu_note?: string;
}

const MACRO_COLORS = { protein: "#62e23f", carbs: "#FF9F0A", fat: "#32ADE6" };

const POPULAR = [
  "Chipotle", "McDonald's", "Subway", "Chick-fil-A", "Panera Bread",
  "Shake Shack", "Sweetgreen", "Panda Express", "Five Guys", "Wingstop",
  "Jersey Mike's", "Starbucks",
];

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className="num font-display font-bold text-sm leading-none" style={{ color }}>
        {value}<span className="text-text-muted text-[10px] font-normal">{unit}</span>
      </p>
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function ItemCard({ item, index }: { item: MenuItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const colors = [
    "border-lime/20 bg-lime/5",
    "border-amber-app/20 bg-amber-app/5",
    "border-cyan-app/20 bg-cyan-app/5",
    "border-border bg-card",
  ];
  const color = colors[index % colors.length];

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${color}`}>
      <button className="w-full p-4 text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-display font-bold text-text-primary text-base leading-tight">{item.name}</h3>
              <span className="text-text-muted text-xs border border-border rounded-full px-2 py-0.5 bg-surface">{item.category}</span>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">{item.why}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="num font-display font-bold text-xl text-text-primary leading-none">{item.calories}</p>
            <p className="text-text-muted text-[10px]">kcal</p>
            <p className="text-lime text-xs font-mono mt-0.5">${item.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <MacroChip label="Protein" value={item.protein_g} unit="g" color={MACRO_COLORS.protein} />
          <MacroChip label="Carbs" value={item.carbs_g} unit="g" color={MACRO_COLORS.carbs} />
          <MacroChip label="Fat" value={item.fat_g} unit="g" color={MACRO_COLORS.fat} />
          {item.sodium_mg > 0 && (
            <div className="text-center ml-auto">
              <p className={`num font-display font-bold text-sm leading-none ${item.sodium_mg > 1500 ? "text-red-400" : "text-text-secondary"}`}>
                {item.sodium_mg}<span className="text-text-muted text-[10px] font-normal">mg</span>
              </p>
              <p className="text-text-muted text-[10px] mt-0.5">Sodium</p>
            </div>
          )}
          <span className={`ml-auto text-text-muted text-xs transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <div className="flex items-start gap-2">
            <span className="text-lime text-sm flex-shrink-0 mt-0.5">→</span>
            <p className="text-text-secondary text-sm leading-relaxed">
              <span className="text-lime font-medium">Order it like this:</span> {item.customization}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const HEALTH_TAG_STYLE: Record<NearbyRestaurant["healthTag"], string> = {
  healthy: "border-lime/30 bg-lime/5 text-lime",
  moderate: "border-amber-app/30 bg-amber-app/5 text-amber-app",
  indulgent: "border-border bg-card text-text-secondary",
};

const HEALTH_TAG_LABEL: Record<NearbyRestaurant["healthTag"], string> = {
  healthy: "Healthy",
  moderate: "Moderate",
  indulgent: "Indulgent",
};

function NearbyCard({ r, onSelect }: { r: NearbyRestaurant; onSelect: (name: string, location: string) => void }) {
  return (
    <button
      onClick={() => onSelect(r.name, r.address || "")}
      className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl hover:border-lime/30 hover:bg-lime/5 transition-all text-left w-full"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-display font-bold text-text-primary text-sm leading-tight truncate">{r.name}</span>
          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium flex-shrink-0 ${HEALTH_TAG_STYLE[r.healthTag]}`}>
            {HEALTH_TAG_LABEL[r.healthTag]}
          </span>
        </div>
        <p className="text-text-muted text-xs">{r.cuisine} · {r.distanceMiles} mi{r.address ? ` · ${r.address}` : ""}</p>
      </div>
      <span className="text-lime text-xs font-mono flex-shrink-0 mt-1">→</span>
    </button>
  );
}

export default function RestaurantsPage() {
  const supabase = createClient();

  // User prefs
  const [goals, setGoals] = useState<string[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");

  // Discover section
  const [discoverZip, setDiscoverZip] = useState("");
  const [discoverFilter, setDiscoverFilter] = useState<"all" | "healthy" | "moderate">("all");
  const [nearbyList, setNearbyList] = useState<NearbyRestaurant[] | null>(null);
  const [nearbyCity, setNearbyCity] = useState("");
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [geoLocating, setGeoLocating] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);

  // Menu lookup section
  const [restaurantInput, setRestaurantInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [budget, setBudget] = useState(15);
  const [noBudget, setNoBudget] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedMenu, setPastedMenu] = useState("");
  const [menuImageBase64, setMenuImageBase64] = useState<string | null>(null);
  const [menuImageType, setMenuImageType] = useState<string>("image/jpeg");
  const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<RestaurantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupRef = useRef<HTMLDivElement>(null);

  const fetchNearby = async (zip: string, filter = discoverFilter, coords?: { lat: number; lng: number }) => {
    setNearbyLoading(true);
    setNearbyError("");
    setNearbyList(null);
    setShowAllNearby(false);
    try {
      let lat: number, lng: number;
      if (coords) {
        lat = coords.lat; lng = coords.lng;
      } else {
        const z = zip.trim();
        if (!z) { setNearbyLoading(false); return; }
        const res = await fetch(`/api/geocode?zip=${encodeURIComponent(z)}`);
        const geo = await res.json();
        if (!geo.lat) { setNearbyError(geo.error || "Could not find that ZIP code."); setNearbyLoading(false); return; }
        lat = geo.lat; lng = geo.lng;
        setNearbyCity(geo.city || z);
      }
      // Call Overpass directly from the browser — bypasses server-side fetch issues
      let restaurants = await fetchNearbyRestaurants(lat, lng);
      if (filter === "healthy") restaurants = restaurants.filter(r => r.healthTag === "healthy");
      else if (filter === "moderate") restaurants = restaurants.filter(r => r.healthTag !== "indulgent");
      setNearbyList(restaurants);
      if (!nearbyCity && coords) {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const geo = await res.json();
        setNearbyCity(geo.city || "your area");
      }
    } catch {
      setNearbyError("Could not reach map data. Try again in a moment.");
    }
    setNearbyLoading(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNearbyError("Geolocation is not supported by your browser. Enter a ZIP code instead.");
      return;
    }
    setGeoLocating(true);
    setNearbyError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        fetchNearby("", discoverFilter, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeoLocating(false);
        setNearbyError("Location access denied. Enter a ZIP code instead.");
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: ob }, { data: pr }] = await Promise.all([
        supabase.from("onboarding").select("goals, zip_code, weight_kg").eq("user_id", user.id).single(),
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
      ]);
      if (ob?.goals) setGoals(ob.goals);
      if (ob?.weight_kg) setWeightKg(ob.weight_kg);
      setUserTier((pr?.subscription_tier as "free" | "pro") ?? "free");
      const zip = ob?.zip_code;
      // Only pre-fill the ZIP — user must press Find to load results
      if (zip) setDiscoverZip(zip);
    };
    load();
  }, []);

  const discoverNearby = () => fetchNearby(discoverZip);

  const handleSelectNearby = (name: string, address: string) => {
    setRestaurantInput(name);
    setLocationInput(address);
    setResult(null);
    setError("");
    lookupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const analyze = async (name?: string) => {
    const target = (name ?? restaurantInput).trim();
    if (!target) return;
    if (name) setRestaurantInput(name);
    setLoading(true);
    setError("");
    setResult(null);
    setMenuImageBase64(null);
    setMenuImagePreview(null);

    try {
      const res = await fetch("/api/restaurant-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: target,
          location: locationInput.trim(),
          budget: noBudget ? null : budget,
          goals,
          weight_kg: weightKg,
          pastedMenu: pastedMenu.trim() || undefined,
          menuImageBase64: menuImageBase64 || undefined,
          menuImageType: menuImageBase64 ? menuImageType : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const confidenceLabel = {
    high: "Accurate menu data",
    medium: "Estimated from known menu",
    low: "Best estimate — verify prices",
  };
  const confidenceColor = {
    high: "text-lime border-lime/30 bg-lime/10",
    medium: "text-amber-app border-amber-app/30 bg-amber-app/10",
    low: "text-red-400 border-red-400/30 bg-red-400/10",
  };
  const dataSourceLabel = {
    web_fetch: "Live menu data",
    user_provided: "Your menu paste",
    training_data: "AI knowledge",
  };
  const dataSourceColor = {
    web_fetch: "text-cyan-app border-cyan-app/30 bg-cyan-app/10",
    user_provided: "text-lime border-lime/30 bg-lime/10",
    training_data: "text-text-muted border-border bg-surface",
  };

  // Filtering is applied inside fetchNearby; nearbyList already reflects the active filter
  const filteredNearby = nearbyList ?? [];

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">AI-powered</p>
        <h1 className="font-display font-black text-3xl text-text-primary">Eat Out Smarter</h1>
        <p className="text-text-secondary mt-1 text-sm">Find healthy picks at any restaurant — from Chipotle to the local spot down the street.</p>
      </div>

      {/* ── Discover Nearby ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display font-bold text-text-primary text-lg">Discover Nearby</h2>
          <span className="px-1.5 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-[10px] font-mono">MAP</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* Location row */}
          <div className="flex gap-2">
            <button
              onClick={useMyLocation}
              disabled={nearbyLoading || geoLocating}
              className="flex items-center gap-2 px-4 py-3 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all disabled:opacity-40 flex-shrink-0"
              title="Use my current location"
            >
              {geoLocating
                ? <ForageSpinner size={16} onLight />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" fill="currentColor"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/></svg>
              }
              <span className="hidden sm:inline">{geoLocating ? "Locating…" : "Use My Location"}</span>
            </button>
            <input
              value={discoverZip}
              onChange={(e) => setDiscoverZip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && discoverNearby()}
              placeholder="or enter ZIP code"
              maxLength={10}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all font-mono"
            />
            <button
              onClick={discoverNearby}
              disabled={!discoverZip.trim() || nearbyLoading}
              className="px-5 py-3 bg-surface border border-border text-text-secondary font-display font-bold text-sm rounded-xl hover:border-lime/40 hover:text-lime transition-all disabled:opacity-40 flex-shrink-0"
            >
              {nearbyLoading
                ? <ForageSpinner size={16} />
                : "Find"}
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {(["all", "healthy", "moderate"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setDiscoverFilter(f);
                  if (nearbyList !== null) fetchNearby(discoverZip, f);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  discoverFilter === f
                    ? "bg-lime/10 border-lime/30 text-lime"
                    : "bg-surface border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                {f === "all" ? "All" : f === "healthy" ? "Healthy" : "Moderate+"}
              </button>
            ))}
          </div>
        </div>

        {/* Nearby results */}
        {nearbyLoading && (
          <div className="mt-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {nearbyError && !nearbyLoading && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">{nearbyError}</div>
        )}

        {nearbyList && !nearbyLoading && (
          <div className="mt-3 space-y-2">
            {nearbyCity && (
              <p className="text-text-muted text-xs px-1">
                {filteredNearby.length} restaurant{filteredNearby.length !== 1 ? "s" : ""} near {nearbyCity}
                {" · "}click any to get healthy picks
              </p>
            )}
            {filteredNearby.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">No restaurants found. Try a different ZIP or filter.</p>
            ) : (
              <>
                {(showAllNearby ? filteredNearby : filteredNearby.slice(0, 3)).map((r, i) => (
                  <NearbyCard key={i} r={r} onSelect={handleSelectNearby} />
                ))}
                {filteredNearby.length > 3 && (
                  <button
                    onClick={() => setShowAllNearby((v) => !v)}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-border text-text-muted text-sm hover:border-lime/30 hover:text-lime transition-all"
                  >
                    {showAllNearby ? "Show less" : `Show ${filteredNearby.length - 3} more`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Menu Lookup ── */}
      <section ref={lookupRef}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display font-bold text-text-primary text-lg">Get Healthy Picks</h2>
          <span className="px-1.5 py-0.5 bg-lime/10 border border-lime/30 rounded text-lime text-[10px] font-mono">AI</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* Restaurant name */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Restaurant name</label>
            <input
              value={restaurantInput}
              onChange={(e) => setRestaurantInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="e.g. Vern's, Chipotle, Joe's Diner…"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
              Location <span className="normal-case text-text-muted/60">(city, state — helps for local spots)</span>
            </label>
            <input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. Rochester, NY"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
            />
          </div>

          {/* Budget slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted uppercase tracking-wider">
                Budget{!noBudget && <span className="text-lime font-mono ml-1">${budget}</span>}
              </label>
              <button
                onClick={() => setNoBudget((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                  noBudget
                    ? "bg-lime/10 border-lime/30 text-lime"
                    : "bg-surface border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                <span className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${noBudget ? "bg-lime border-lime" : "border-text-muted"}`}>
                  {noBudget && <span className="w-1.5 h-1.5 rounded-full bg-canvas block" />}
                </span>
                No budget
              </button>
            </div>
            {!noBudget && (
              <>
                <input
                  type="range"
                  min={5} max={60} step={1}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-lime h-1.5 rounded-full"
                />
                <div className="flex justify-between text-text-muted text-[10px] mt-1">
                  <span>$5</span><span>$60</span>
                </div>
              </>
            )}
          </div>

          {/* Menu scan / paste */}
          <div>
            <button
              onClick={() => setPasteOpen((v) => !v)}
              className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <span className={`transition-transform ${pasteOpen ? "rotate-90" : ""}`}>▶</span>
              Add menu (optional — greatly improves accuracy for local spots)
            </button>
            {pasteOpen && (
              <div className="mt-3 space-y-3">
                {/* Photo scan */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Scan a photo</p>
                  {userTier !== "pro" ? (
                    <Link href="/dashboard/settings/billing"
                      className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-border rounded-xl text-text-muted text-sm hover:border-lime/40 hover:text-lime transition-all">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Pro — upgrade to scan menu photos
                    </Link>
                  ) : menuImagePreview ? (
                    <div className="relative">
                      <img src={menuImagePreview} alt="Menu" className="w-full max-h-48 object-cover rounded-xl border border-lime/30" />
                      <button
                        onClick={() => { setMenuImageBase64(null); setMenuImagePreview(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-canvas/80 border border-border text-text-muted hover:text-red-400 text-xs flex items-center justify-center transition-colors"
                      >✕</button>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-lime/90 rounded text-canvas text-[10px] font-bold">Menu photo ready</div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-border rounded-xl text-text-muted text-sm hover:border-lime/40 hover:text-lime transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h1l1-2h6l1 2h1a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <circle cx="10" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Take or upload a menu photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setMenuImageType(file.type || "image/jpeg");
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            setMenuImagePreview(dataUrl);
                            setMenuImageBase64(dataUrl.split(",")[1]);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-text-muted text-[10px] uppercase tracking-wider">or paste text</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Text paste */}
                <textarea
                  value={pastedMenu}
                  onChange={(e) => setPastedMenu(e.target.value)}
                  placeholder="Paste menu items, prices, or any info from the restaurant's website or menu board…"
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={() => analyze()}
            disabled={!restaurantInput.trim() || loading}
            className="w-full py-3.5 bg-lime text-canvas font-display font-bold text-sm rounded-xl hover:bg-lime-glow transition-all disabled:opacity-40"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><ForageSpinner size={16} onLight /> Analyzing…</span>
              : "Analyze Restaurant"}
          </button>

          {/* Popular shortcuts */}
          <div>
            <p className="text-xs text-text-muted mb-2">Quick picks</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR.map((r) => (
                <button key={r} onClick={() => { setLocationInput(""); analyze(r); }}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-text-secondary text-xs hover:border-lime/40 hover:text-lime transition-all">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-5 bg-card border border-border rounded-2xl">
            <ForageSpinner size={20} />
            <p className="text-text-secondary text-sm">Searching menu data for {restaurantInput}…</p>
          </div>
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Restaurant header */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1">
              <h2 className="font-display font-black text-2xl text-text-primary">{result.restaurant_name}</h2>
              <p className="text-text-muted text-xs mt-0.5">{noBudget ? "No budget limit" : `Under $${budget}`} · {goals.length ? goals[0] : "high protein"} focus</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {result.data_source && (
                <span className={`px-2.5 py-1 rounded-full border text-xs font-medium flex-shrink-0 ${dataSourceColor[result.data_source]}`}>
                  {dataSourceLabel[result.data_source]}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full border text-xs font-medium flex-shrink-0 ${confidenceColor[result.confidence]}`}>
                {confidenceLabel[result.confidence]}
              </span>
            </div>
          </div>

          {/* Menu note (for uncertain/niche restaurants) */}
          {result.menu_note && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-app/5 border border-amber-app/20 rounded-xl">
              <span className="text-amber-app flex-shrink-0 text-sm">ℹ</span>
              <p className="text-text-secondary text-xs leading-relaxed">{result.menu_note}</p>
            </div>
          )}

          {/* Item cards */}
          <div className="space-y-3">
            {(result.items ?? []).map((item, i) => <ItemCard key={i} item={item} index={i} />)}
          </div>

          {/* Tips */}
          {(result.tips?.length ?? 0) > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mb-3">Ordering Tips</h3>
              <div className="space-y-2">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-lime/10 border border-lime/20 text-lime text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <p className="text-text-secondary text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avoid */}
          {(result.avoid?.length ?? 0) > 0 && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5">
              <h3 className="font-display font-bold text-red-400 text-xs uppercase tracking-wider mb-3">Skip These</h3>
              <div className="space-y-2">
                {result.avoid.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 text-sm">✕</span>
                    <p className="text-text-secondary text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-text-muted text-xs text-center">
            {result.data_source === "web_fetch"
              ? "Menu data fetched from the web. Verify prices at the restaurant."
              : result.data_source === "user_provided"
              ? "Based on the menu you provided."
              : result.confidence === "low"
              ? "Menu data is estimated — verify prices and macros on the restaurant's official site."
              : "Macros from restaurant's nutritional data. Prices are approximate."}
          </p>
        </div>
      )}
    </div>
  );
}
