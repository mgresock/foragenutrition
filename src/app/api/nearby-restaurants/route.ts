import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const HEALTHY_CUISINES = new Set([
  "sushi","japanese","thai","vietnamese","mediterranean","greek","indian",
  "salad","vegan","vegetarian","organic","poke","korean","turkish","lebanese",
  "middle_eastern","juice","smoothies","acai","hawaiian","seafood","fish",
  "ramen","peruvian","ethiopian","moroccan",
]);
const MODERATE_CUISINES = new Set([
  "mexican","chinese","american","italian","sandwich","deli","pizza",
  "cafe","coffee","french","spanish","portuguese","tex-mex","burger",
  "chicken","wings","sub","wrap","bowl","steakhouse","bbq","barbecue",
]);
const INDULGENT_NAMES = /^(mcdonald|burger king|wendy|taco bell|kfc|popeye|sonic drive|dairy queen|little caesar|domino|papa john|pizza hut|checkers|rally|whataburger|hardee|carl.s jr|jack in the box)/i;

function classifyCuisine(name: string, raw: string): { label: string; tag: NearbyRestaurant["healthTag"] } {
  const c = (raw || "").toLowerCase().replace(/[^a-z_]/g, "");
  if (INDULGENT_NAMES.test(name)) return { label: "Fast Food", tag: "indulgent" };
  if (HEALTHY_CUISINES.has(c)) return { label: c.replace(/_/g, " ") || "Restaurant", tag: "healthy" };
  if (MODERATE_CUISINES.has(c)) return { label: c.replace(/_/g, " ") || "Restaurant", tag: "moderate" };
  if (raw === "fast_food") return { label: "Fast Food", tag: "indulgent" };
  return { label: "Restaurant", tag: "moderate" };
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; city: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&countrycodes=US&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "ForageNutritionApp/1.0 (mcgresock@gmail.com)" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;
    const addr = data[0].address;
    const city = addr?.city || addr?.town || addr?.village || addr?.suburb || zip;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), city };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "ForageNutritionApp/1.0 (mcgresock@gmail.com)" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const addr = data.address;
    return addr?.city || addr?.town || addr?.village || addr?.suburb || "";
  } catch {
    return "";
  }
}

async function queryOverpass(lat: number, lng: number, radiusM: number): Promise<Record<string, unknown>[] | null> {
  // Use explicit = per type (more portable across Overpass mirrors than ~ regex)
  const query = `[out:json][timeout:25];
(
  node["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  way["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  node["amenity"="fast_food"](around:${radiusM},${lat},${lng});
  way["amenity"="fast_food"](around:${radiusM},${lat},${lng});
  node["amenity"="cafe"](around:${radiusM},${lat},${lng});
  way["amenity"="cafe"](around:${radiusM},${lat},${lng});
  node["amenity"="juice_bar"](around:${radiusM},${lat},${lng});
);
out center qt 120;`;

  const tryEndpoint = async (endpoint: string): Promise<Record<string, unknown>[]> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(27000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.elements)) throw new Error("bad response");
    if ((data as { remark?: string }).remark?.includes("timed out")) throw new Error("query timeout");
    return data.elements;
  };

  try {
    return await Promise.any(OVERPASS_ENDPOINTS.map(tryEndpoint));
  } catch {
    return null;
  }
}

function parseElements(elements: Record<string, unknown>[], originLat: number, originLng: number): NearbyRestaurant[] {
  const seen = new Map<string, NearbyRestaurant>();

  for (const el of elements) {
    const tags = el.tags as Record<string, string> | undefined;
    const name = tags?.name?.trim();
    if (!name || name.length < 2) continue;

    const elType = el.type as string;
    let elLat: number, elLng: number;
    if (elType === "way" || elType === "relation") {
      elLat = (el.center as { lat: number } | undefined)?.lat ?? 0;
      elLng = (el.center as { lon: number } | undefined)?.lon ?? 0;
    } else {
      elLat = (el.lat as number) ?? 0;
      elLng = (el.lon as number) ?? 0;
    }
    if (!elLat || !elLng) continue;

    const amenity = tags?.amenity || "restaurant";
    const rawCuisine = tags?.cuisine?.split(";")[0]?.trim() || amenity;
    const { label, tag } = classifyCuisine(name, rawCuisine);
    const dist = haversineMiles(originLat, originLng, elLat, elLng);
    const addr = [tags?.["addr:housenumber"], tags?.["addr:street"]].filter(Boolean).join(" ") || tags?.["addr:full"] || "";
    const website = tags?.website || tags?.["contact:website"] || undefined;

    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (!existing || dist < existing.distanceMiles) {
      seen.set(key, { name, cuisine: label, healthTag: tag, distanceMiles: Math.round(dist * 10) / 10, address: addr, website, lat: elLat, lng: elLng });
    }
  }

  return [...seen.values()].sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const filter = params.get("filter") || "all";

  // Accept direct coordinates (from browser geolocation) OR a ZIP code
  const rawLat = params.get("lat");
  const rawLng = params.get("lng");
  const zip = params.get("zip");

  let coords: { lat: number; lng: number; city: string } | null = null;

  if (rawLat && rawLng) {
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    const city = await reverseGeocode(lat, lng);
    coords = { lat, lng, city };
  } else if (zip) {
    coords = await geocodeZip(zip.trim()).catch(() => null);
    if (!coords) {
      return NextResponse.json({ error: `Could not locate ZIP code ${zip}. Try entering your location manually.` }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "Provide lat/lng or zip" }, { status: 400 });
  }

  const radiusM = 8000; // ~5 miles
  const elements = await queryOverpass(coords.lat, coords.lng, radiusM);
  if (!elements) {
    return NextResponse.json({ error: "Map data unavailable right now — try again in a moment.", restaurants: [], city: coords.city });
  }

  let restaurants = parseElements(elements, coords.lat, coords.lng);

  if (filter === "healthy") restaurants = restaurants.filter((r) => r.healthTag === "healthy");
  else if (filter === "moderate") restaurants = restaurants.filter((r) => r.healthTag !== "indulgent");

  return NextResponse.json({ restaurants: restaurants.slice(0, 40), city: coords.city, coords });
}
