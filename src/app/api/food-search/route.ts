import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Food database lookup via Open Food Facts (free, open, 2.5M+ branded products).
// Two modes: ?q=<text> for a name search, ?barcode=<digits> for a scan lookup.
// Auth-gated; results normalized to the app's macro shape. Per-serving values
// are used when available, otherwise per-100g (flagged via `basis`).

export interface FoodResult {
  id: string;            // barcode (Open Food Facts code)
  name: string;
  brand: string;
  basis: "serving" | "100g";
  serving_size: string;  // e.g. "30 g" when known
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  sodium_mg?: number;
  image?: string;
  grade?: string;        // Nutri-Score a–e
}

const UA = `Forage/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? "https://foragenutrition.app"})`;
const FIELDS = "code,product_name,brands,nutriments,serving_size,image_small_url,nutrition_grades";

type Nutriments = Record<string, number | string | undefined>;

function num(v: number | string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

// Build a normalized result, preferring per-serving values, else per-100g.
function normalize(p: {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
  serving_size?: string;
  image_small_url?: string;
  nutrition_grades?: string;
}): FoodResult | null {
  const name = (p.product_name ?? "").trim();
  if (!name) return null;
  const n = p.nutriments ?? {};

  const hasServing = num(n["energy-kcal_serving"]) != null || num(n["proteins_serving"]) != null;
  const basis: "serving" | "100g" = hasServing ? "serving" : "100g";
  const k = (base: string) => num(n[`${base}_${basis}`]);

  const calories = num(n[`energy-kcal_${basis}`]) ?? (basis === "serving" ? num(n["energy-kcal_100g"]) : undefined);
  if (calories == null) return null; // skip items with no calorie data — not useful to log

  const sodiumG = k("sodium") ?? k("salt"); // salt is sometimes the only field; rough but better than nothing
  const round = (v: number | undefined, d = 1) => (v == null ? undefined : Math.round(v * 10 ** d) / 10 ** d);

  return {
    id: (p.code ?? "").trim() || name,
    name,
    brand: (p.brands ?? "").split(",")[0]?.trim() ?? "",
    basis,
    serving_size: (p.serving_size ?? "").trim(),
    calories: Math.round(calories),
    protein_g: round(k("proteins")) ?? 0,
    carbs_g: round(k("carbohydrates")) ?? 0,
    fat_g: round(k("fat")) ?? 0,
    fiber_g: round(k("fiber")),
    sugar_g: round(k("sugars")),
    saturated_fat_g: round(k("saturated-fat")),
    sodium_mg: sodiumG != null ? Math.round(sodiumG * 1000) : undefined,
    image: p.image_small_url || undefined,
    grade: (p.nutrition_grades ?? "").trim() || undefined,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const barcode = (params.get("barcode") ?? "").replace(/[^0-9]/g, "").slice(0, 14);
  const q = (params.get("q") ?? "").toString().slice(0, 120).trim();

  try {
    // ── Barcode lookup ──
    if (barcode) {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        return NextResponse.json({ result: null, error: "not_found" }, { status: 404 });
      }
      const result = normalize({ code: barcode, ...data.product });
      if (!result) return NextResponse.json({ result: null, error: "no_nutrition" }, { status: 404 });
      return NextResponse.json({ result });
    }

    // ── Text search ──
    if (q.length >= 2) {
      const url =
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`;
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
      if (!res.ok) return NextResponse.json({ error: "Search failed" }, { status: 502 });
      const data = await res.json();
      const products: unknown[] = Array.isArray(data.products) ? data.products : [];
      const seen = new Set<string>();
      const results = products
        .map((p) => normalize(p as Parameters<typeof normalize>[0]))
        .filter((r): r is FoodResult => {
          if (!r) return false;
          const key = `${r.brand}|${r.name}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 20);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Provide q or barcode" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Food lookup unavailable right now — try again." }, { status: 503 });
  }
}
