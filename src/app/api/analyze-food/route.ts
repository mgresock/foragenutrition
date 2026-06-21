import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess } from "@/lib/subscription";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tool schema — Claude fills typed parameters instead of generating free-form JSON.
// This is far more consistent than text generation for numeric values.
const NUTRITION_TOOL: Anthropic.Tool = {
  name: "log_nutrition",
  description: "Record the exact nutritional content of a food item or meal.",
  input_schema: {
    type: "object" as const,
    properties: {
      name:           { type: "string",  description: "Descriptive name of the food or meal" },
      items: {
        type: "array",
        description: "REQUIRED. Break the meal into each distinct component (every food, plus cooking oils/sauces/dressings). Estimate each component's portion and macros SEPARATELY using standard nutrition data — the meal totals MUST equal the sum of these items. This itemized approach is far more accurate than guessing a single total.",
        items: {
          type: "object",
          properties: {
            name:     { type: "string",  description: "Component name, e.g. 'Grilled chicken breast'" },
            portion:  { type: "string",  description: "Estimated portion with a weight, e.g. '6 oz (~170g)', '1 cup (~150g)', '1 tbsp (~14g)'" },
            calories: { type: "integer" },
            protein:  { type: "number" },
            carbs:    { type: "number" },
            fat:      { type: "number" },
          },
          required: ["name", "portion", "calories", "protein", "carbs", "fat"],
        },
      },
      calories:       { type: "integer", description: "Total calories (kcal) — must equal the sum of items" },
      protein:        { type: "number",  description: "Protein in grams — sum of items" },
      carbs:          { type: "number",  description: "Total carbohydrates in grams — sum of items" },
      fat:            { type: "number",  description: "Total fat in grams — sum of items" },
      fiber:          { type: "number",  description: "Dietary fiber in grams" },
      sugar:          { type: "number",  description: "Total sugar in grams" },
      saturated_fat:  { type: "number",  description: "Saturated fat in grams" },
      sodium:         { type: "integer", description: "Sodium in milligrams" },
      protein_quality: { type: "string", enum: ["complete", "incomplete", "mixed"], description: "complete=animal proteins with all EAAs; incomplete=plant proteins; mixed=combination" },
      carb_type:      { type: "string",  enum: ["simple", "complex", "mixed"], description: "simple=sugars/white bread; complex=whole grains/veg; mixed=both" },
      confidence:     { type: "string",  enum: ["high", "medium", "low"] },
      notes:          { type: "string",  description: "One sentence about this food's nutritional profile" },
      vitamin_c_mg:   { type: "integer", description: "Vitamin C in milligrams — estimate from ingredients if exact value unknown" },
      vitamin_d_mcg:  { type: "number",  description: "Vitamin D in micrograms — estimate from ingredients" },
      vitamin_b12_mcg:{ type: "number",  description: "Vitamin B12 in micrograms — estimate from ingredients" },
      calcium_mg:     { type: "integer", description: "Calcium in milligrams — estimate from ingredients" },
      iron_mg:        { type: "number",  description: "Iron in milligrams — estimate from ingredients" },
      potassium_mg:   { type: "integer", description: "Potassium in milligrams — estimate from ingredients" },
      magnesium_mg:   { type: "integer", description: "Magnesium in milligrams — estimate from ingredients" },
    },
    required: ["name", "items", "calories", "protein", "carbs", "fat", "fiber", "sugar", "saturated_fat", "sodium", "protein_quality", "carb_type", "confidence", "notes", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_b12_mcg", "calcium_mg", "iron_mg", "potassium_mg", "magnesium_mg"],
  },
};

function extractToolInput(response: Anthropic.Message): Record<string, unknown> | null {
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  return block.input as Record<string, unknown>;
}

// Ground the macro totals in the per-item breakdown: recompute calories/protein/
// carbs/fat as the SUM of the items the model itemized (rather than trusting a
// holistic guess), and expose the breakdown as `components` for the UI.
function groundFromItems(input: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(input.items) ? (input.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) return input;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const sum = (k: string) => items.reduce((s, it) => s + (Number(it[k]) || 0), 0);
  const components = items.map((it) => ({
    name: String(it.name ?? "").slice(0, 80),
    amount: String(it.portion ?? "").slice(0, 60),
    calories: Math.round(Number(it.calories) || 0),
    protein_g: r1(Number(it.protein) || 0),
    carbs_g: r1(Number(it.carbs) || 0),
    fat_g: r1(Number(it.fat) || 0),
  }));
  return {
    ...input,
    calories: Math.round(sum("calories")),
    protein: r1(sum("protein")),
    carbs: r1(sum("carbs")),
    fat: r1(sum("fat")),
    components,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Subscription gate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quotaError = () => NextResponse.json({
      error: "Monthly AI limit reached. Upgrade to Pro for unlimited access.",
      upgrade: true,
      remaining: 0,
    }, { status: 402 });

    const contentType = req.headers.get("content-type") || "";

    // TEXT / BRAND mode
    if (contentType.includes("application/json")) {
      const { description, brand, product, serving } = await req.json();

      let prompt = "";
      let ck = "";

      if (brand || product) {
        const servingNote = serving ? ` (serving size: ${serving})` : "";
        ck = cacheKey("food:brand:v2", `${brand ?? ""}|${product ?? ""}|${serving ?? ""}`);
        prompt = `Look up the published nutrition label for this branded food item:
Brand: ${brand || "unknown"}
Product: ${product || "unknown"}${servingNote}

Call log_nutrition with the values from the official nutrition label for the stated serving. Put the product as a single entry in items. Use exact label values where you know them; if estimating, set confidence to "low".`;
      } else if (description) {
        ck = cacheKey("food:desc:v2", String(description));
        prompt = `A user described their meal: "${description}"

Estimate its nutrition ACCURATELY by decomposing it:
1. Break the meal into every distinct component — each food, plus cooking oils, butter, sauces, and dressings (these add significant hidden calories).
2. For EACH component, estimate the portion with a weight in grams (use the amounts stated; otherwise assume realistic home/restaurant portions — cooked portions are usually LARGER than label single-servings).
3. Look up each component's macros from standard per-100g nutrition data and scale to the portion.
4. Put every component in items. The totals must equal the sum of the items.
Set confidence based on how specific the description was.`;
      } else {
        return NextResponse.json({ error: "No input provided" }, { status: 400 });
      }

      // Cache hit → instant, and doesn't consume the AI quota or an API call.
      const cached = await cacheGet<Record<string, unknown>>(ck);
      if (cached) return NextResponse.json({ ...cached, cached: true });

      const access = await checkAiAccess(user.id, user.email ?? "");
      if (!access.allowed) return quotaError();

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001", // text/brand lookups — Haiku is fast and cheap
        max_tokens: 2048,
        system: "You are a precise sports-nutrition estimator. Decompose meals into components, estimate each portion's weight, and derive macros from standard nutrition data. Always call log_nutrition; the totals must equal the sum of the items.",
        tools: [NUTRITION_TOOL],
        tool_choice: { type: "any" },
        messages: [{ role: "user", content: prompt }],
      });

      const raw = extractToolInput(response);
      if (!raw) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
      const input = groundFromItems(raw);
      await cacheSet(ck, input);
      return NextResponse.json(input);
    }

    // IMAGE mode requires quota (images aren't cached — each photo is unique)
    const imgAccess = await checkAiAccess(user.id, user.email ?? "");
    if (!imgAccess.allowed) return quotaError();

    // IMAGE mode
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: "You are a precise sports-nutrition estimator analyzing food photos. Identify every component, estimate portion sizes from visual scale cues, and derive macros from standard nutrition data. Always call log_nutrition; the totals must equal the sum of the items.",
      tools: [NUTRITION_TOOL],
      tool_choice: { type: "any" },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Estimate this meal's nutrition ACCURATELY by decomposing it:
1. Identify every distinct food on the plate, plus visible oils, butter, sauces, cheese, and dressings.
2. Estimate EACH component's portion in grams using visual scale cues — plate/bowl diameter (~26cm dinner plate), fork/spoon size, a deck-of-cards (~85g) for meat, a fist (~150g) for grains/veg, the food's depth and how full the container is.
3. Derive each component's macros from standard per-100g nutrition data scaled to its portion.
4. Put every component in items; the totals must equal their sum. If unsure, set confidence to "low" but still give your best itemized estimate.` },
        ],
      }],
    });

    const raw = extractToolInput(response);
    if (!raw) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    return NextResponse.json(groundFromItems(raw));

  } catch (err) {
    console.error("Food analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
