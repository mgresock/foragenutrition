import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface NearbyStore {
  name: string;
  type: string;
  distanceMiles: number;
  lat: number;
  lng: number;
}

// Confirmed working mirrors first; overpass-api.de last (returns 406 in some regions)
const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Short name regex for major chains OSM sometimes tags without a specific shop value.
// Keep it short — long regexes can cause Overpass query parse failures.
const CHAIN_REGEX = "Walmart|Target|Costco|Sam.s Club|BJ.s|Aldi|Whole Foods|Trader Joe.s|Dollar General|Family Dollar";

// Clearly non-grocery stores and gas stations to exclude
const NON_GROCERY = /^(home depot|lowe.s|best buy|macy.s|nordstrom|ross |tj maxx|t\.j\. maxx|marshalls|burlington|old navy|gap |h&m|ikea|autozone|o.reilly|advance auto|jiffy lube|pepboys|mcdonald|subway|pizza|kfc|taco bell|chick-fil|starbucks|dunkin|panera|chipotle|domino|five guys|popeyes|sonic drive|dairy queen|little caesar|big lots|five below|bath & body|victoria.s secret|petco|petsmart|home goods|homegoods|ulta|sephora|delta sonic|car wash|mobil|exxon|shell|chevron|sunoco|bp$|marathon gas|speedway|valero|circle k|7-eleven|ampm|arco|casey.s|wawa|sheetz|kwik trip|pilot travel|love.s travel|flying j|pilot flying|quiktrip|raceway|rapid|fuel|aplus|sunoco)/i;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; city: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&countrycodes=US&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "ForageNutritionApp/1.0 (mcgresock@gmail.com)" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("not ok");
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

function buildQuery(lat: number, lng: number, radiusM: number): string {
  // Primary: shop-tag indexed query (fast — uses Overpass key index)
  // Secondary: short name regex with ["shop"] guard to stay on the key index
  return `[out:json][timeout:25];
(
  nwr["shop"~"supermarket|grocery|health_food|wholesale|food|greengrocer|department_store|organic|deli|convenience|variety_store|discount_supermarket|superstore|farm|frozen_food"](around:${radiusM},${lat},${lng});
  nwr["name"~"${CHAIN_REGEX}",i]["shop"](around:${radiusM},${lat},${lng});
);
out center qt 60;`;
}

async function queryOverpass(query: string): Promise<Record<string, unknown>[] | null> {
  const tryEndpoint = async (endpoint: string): Promise<Record<string, unknown>[]> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(22000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.elements)) throw new Error("bad response");
    // Overpass sometimes returns elements=[] with a "remark" about timeout
    if ((data as { remark?: string }).remark?.includes("timed out")) throw new Error("query timeout");
    return data.elements;
  };

  try {
    return await Promise.any(OVERPASS_ENDPOINTS.map(tryEndpoint));
  } catch {
    return null;
  }
}

function classifyStore(tags: Record<string, string>): string {
  const shop = tags.shop ?? "";
  const name = (tags.name ?? "").toLowerCase();
  const map: Record<string, string> = {
    supermarket: "Supermarket", grocery: "Grocery", health_food: "Health Food",
    wholesale: "Wholesale", food: "Grocery", greengrocer: "Produce",
    convenience: "Convenience", organic: "Health Food", deli: "Deli",
    butcher: "Butcher", seafood: "Seafood", bakery: "Bakery",
    department_store: "Superstore",
  };
  if (map[shop]) return map[shop];
  if (/costco|sam.s club|bj.s/i.test(name)) return "Wholesale";
  if (/walmart|target|super ?center/i.test(name)) return "Superstore";
  if (/whole foods|sprouts|natural grocers|earth fare|fresh market/i.test(name)) return "Health Food";
  if (/aldi|lidl|grocery outlet|food 4 less|save-a-lot/i.test(name)) return "Discount";
  if (/dollar general|family dollar/i.test(name)) return "Discount";
  return "Grocery";
}

function parseStores(elements: Record<string, unknown>[], lat: number, lng: number): NearbyStore[] {
  const seen = new Map<string, NearbyStore>();

  for (const el of elements) {
    const tags = el.tags as Record<string, string> | undefined;
    const name = tags?.name?.trim();
    if (!name || name.length < 2) continue;

    // Skip gas stations and non-grocery stores
    if (NON_GROCERY.test(name)) continue;
    if (tags?.amenity === "fuel") continue;

    const elType = el.type as string;
    const elLat = elType === "way" || elType === "relation"
      ? (el.center as { lat: number })?.lat
      : el.lat as number;
    const elLng = elType === "way" || elType === "relation"
      ? (el.center as { lon: number })?.lon
      : el.lon as number;
    if (!elLat || !elLng) continue;

    const dist = haversineMiles(lat, lng, elLat, elLng);
    const type = classifyStore(tags ?? {});
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (!existing || dist < existing.distanceMiles) {
      seen.set(key, { name, type, distanceMiles: Math.round(dist * 10) / 10, lat: elLat, lng: elLng });
    }
  }

  return [...seen.values()].sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const rawLat = params.get("lat");
  const rawLng = params.get("lng");
  const zip = params.get("zip");

  let coords: { lat: number; lng: number; city: string } | null = null;

  if (rawLat && rawLng) {
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);
    if (isNaN(lat) || isNaN(lng)) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    const city = await reverseGeocode(lat, lng);
    coords = { lat, lng, city };
  } else if (zip) {
    coords = await geocodeZip(zip.trim());
    if (!coords) {
      return NextResponse.json(
        { error: `Could not locate ZIP code ${zip}. Check the ZIP or add stores manually below.` },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "Provide lat/lng or zip" }, { status: 400 });
  }

  for (const radiusM of [8000, 25000]) {
    const elements = await queryOverpass(buildQuery(coords.lat, coords.lng, radiusM));
    if (elements === null) continue;

    const stores = parseStores(elements, coords.lat, coords.lng);
    if (stores.length >= 3 || radiusM === 25000) {
      return NextResponse.json({
        stores: stores.slice(0, 30),
        coords,
        city: coords.city,
        radius_miles: Math.round(radiusM / 1609),
      });
    }
  }

  return NextResponse.json({
    error: `No stores found nearby. Try adding stores manually below.`,
    stores: [],
    city: coords.city,
  });
}
