// Client-side Overpass queries — called directly from the browser, not via API routes.
// Browser fetch to Overpass works reliably; server-side fetch has env-specific issues.

export interface NearbyStore {
  name: string;
  type: string;
  distanceMiles: number;
  lat: number;
  lng: number;
}

export interface NearbyRestaurant {
  name: string;
  cuisine: string;
  healthTag: "healthy" | "moderate" | "indulgent";
  distanceMiles: number;
  address: string;
  website?: string;
  lat: number;
  lng: number;
}

const ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

async function runQuery(query: string): Promise<Record<string, unknown>[]> {
  const body = new URLSearchParams({ data: query }).toString();

  const tryEndpoint = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.elements)) throw new Error("no elements");
    if ((data as { remark?: string }).remark?.includes("timed out")) throw new Error("timeout");
    // Treat empty results as a failure so Promise.any skips to a better endpoint
    if (data.elements.length === 0) throw new Error("empty");
    return data.elements as Record<string, unknown>[];
  };

  try {
    return await Promise.any(ENDPOINTS.map(tryEndpoint));
  } catch {
    // All endpoints returned empty or failed
    return [];
  }
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coords(el: Record<string, unknown>): { lat: number; lng: number } | null {
  const t = el.type as string;
  if (t === "way" || t === "relation") {
    const c = el.center as { lat: number; lon: number } | undefined;
    if (c?.lat && c?.lon) return { lat: c.lat, lng: c.lon };
    return null;
  }
  const lat = el.lat as number;
  const lng = el.lon as number;
  if (!lat || !lng) return null;
  return { lat, lng };
}

// ── Stores ────────────────────────────────────────────────────────────────────

const NON_GROCERY = /^(home depot|lowe|best buy|macy|nordstrom|ross |tj maxx|t\.j\. maxx|marshalls|burlington coat|old navy|gap |h&m|ikea|autozone|o.reilly|advance auto|jiffy lube|pepboys|mcdonald|subway|pizza|kfc|taco bell|chick-fil|starbucks|dunkin|panera|chipotle|domino|five guys|popeyes|sonic drive|dairy queen|little caesar|big lots|five below|bath & body|victoria.s secret|petco|petsmart|home goods|homegoods|ulta|sephora|delta sonic|car wash|mobil|exxon|shell |chevron|sunoco|bp |marathon gas|speedway|valero|circle k|7-eleven|ampm|arco|casey.s|wawa|sheetz|kwik trip|pilot travel|love.s travel|flying j|pilot flying|quiktrip|raceway)/i;

function storeType(tags: Record<string, string>): string {
  const shop = tags.shop ?? "";
  const name = (tags.name ?? "").toLowerCase();
  const map: Record<string, string> = {
    supermarket: "Supermarket", grocery: "Grocery", health_food: "Health Food",
    wholesale: "Wholesale", food: "Grocery", greengrocer: "Produce",
    convenience: "Convenience", organic: "Health Food", deli: "Deli",
    variety_store: "Discount", discount_supermarket: "Discount",
    superstore: "Superstore", department_store: "Superstore",
  };
  if (map[shop]) return map[shop];
  if (/costco|sam.s club|bj.s/i.test(name)) return "Wholesale";
  if (/walmart|target|super ?center/i.test(name)) return "Superstore";
  if (/whole foods|sprouts|natural grocers|earth fare|fresh market/i.test(name)) return "Health Food";
  if (/aldi|lidl|grocery outlet|food 4 less|save-a-lot|dollar/i.test(name)) return "Discount";
  return "Grocery";
}

export async function fetchNearbyStores(lat: number, lng: number, radiusM = 8000): Promise<NearbyStore[]> {
  const query = `[out:json][timeout:25];
(
  nwr["shop"~"supermarket|grocery|health_food|wholesale|food|greengrocer|department_store|organic|deli|convenience|variety_store|discount_supermarket|superstore"](around:${radiusM},${lat},${lng});
  nwr["name"~"Walmart|Target|Costco|Sam.s Club|BJ.s|Aldi|Whole Foods|Trader Joe",i]["shop"](around:${radiusM},${lat},${lng});
);
out center qt 60;`;

  const elements = await runQuery(query);
  const seen = new Map<string, NearbyStore>();

  for (const el of elements) {
    const tags = el.tags as Record<string, string> | undefined;
    const name = tags?.name?.trim();
    if (!name || name.length < 2) continue;
    if (NON_GROCERY.test(name)) continue;
    if (tags?.amenity === "fuel") continue;

    const pos = coords(el);
    if (!pos) continue;

    const dist = haversineMiles(lat, lng, pos.lat, pos.lng);
    const type = storeType(tags ?? {});
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (!existing || dist < existing.distanceMiles) {
      seen.set(key, { name, type, distanceMiles: Math.round(dist * 10) / 10, lat: pos.lat, lng: pos.lng });
    }
  }

  // Expand radius if sparse
  let results = [...seen.values()].sort((a, b) => a.distanceMiles - b.distanceMiles);
  if (results.length < 3 && radiusM < 25000) {
    return fetchNearbyStores(lat, lng, 25000);
  }
  return results.slice(0, 30);
}

// ── Restaurants ───────────────────────────────────────────────────────────────

const HEALTHY = new Set(["sushi","japanese","thai","vietnamese","mediterranean","greek","indian","salad","vegan","vegetarian","organic","poke","korean","turkish","lebanese","middle_eastern","juice","smoothies","acai","hawaiian","seafood","fish","ramen","peruvian","ethiopian","moroccan"]);
const MODERATE = new Set(["mexican","chinese","american","italian","sandwich","deli","pizza","cafe","coffee","french","spanish","tex-mex","burger","chicken","wings","sub","wrap","bowl","steakhouse","bbq","barbecue"]);
const JUNK_NAMES = /^(mcdonald|burger king|wendy|taco bell|kfc|popeye|sonic drive|dairy queen|little caesar|domino|papa john|pizza hut|checkers|whataburger|hardee|carl.s jr|jack in the box)/i;

function classifyRestaurant(name: string, cuisine: string): { label: string; tag: NearbyRestaurant["healthTag"] } {
  const c = cuisine.toLowerCase().replace(/[^a-z_]/g, "");
  if (JUNK_NAMES.test(name)) return { label: "Fast Food", tag: "indulgent" };
  if (HEALTHY.has(c)) return { label: c.replace(/_/g, " "), tag: "healthy" };
  if (MODERATE.has(c)) return { label: c.replace(/_/g, " "), tag: "moderate" };
  if (cuisine === "fast_food") return { label: "Fast Food", tag: "indulgent" };
  return { label: "Restaurant", tag: "moderate" };
}

export async function fetchNearbyRestaurants(lat: number, lng: number, radiusM = 8000): Promise<NearbyRestaurant[]> {
  const query = `[out:json][timeout:25];
(
  node["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  way["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  node["amenity"="fast_food"](around:${radiusM},${lat},${lng});
  way["amenity"="fast_food"](around:${radiusM},${lat},${lng});
  node["amenity"="cafe"](around:${radiusM},${lat},${lng});
  node["amenity"="juice_bar"](around:${radiusM},${lat},${lng});
);
out center qt 120;`;

  const elements = await runQuery(query);
  const seen = new Map<string, NearbyRestaurant>();

  for (const el of elements) {
    const tags = el.tags as Record<string, string> | undefined;
    const name = tags?.name?.trim();
    if (!name || name.length < 2) continue;

    const pos = coords(el);
    if (!pos) continue;

    const amenity = tags?.amenity || "restaurant";
    const rawCuisine = tags?.cuisine?.split(";")[0]?.trim() || amenity;
    const { label, tag } = classifyRestaurant(name, rawCuisine);
    const dist = haversineMiles(lat, lng, pos.lat, pos.lng);
    const addr = [tags?.["addr:housenumber"], tags?.["addr:street"]].filter(Boolean).join(" ") || "";
    const website = tags?.website || tags?.["contact:website"] || undefined;

    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (!existing || dist < existing.distanceMiles) {
      seen.set(key, { name, cuisine: label, healthTag: tag, distanceMiles: Math.round(dist * 10) / 10, address: addr, website, lat: pos.lat, lng: pos.lng });
    }
  }

  return [...seen.values()].sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, 40);
}
