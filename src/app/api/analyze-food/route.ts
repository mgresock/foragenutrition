import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess } from "@/lib/subscription";

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
      calories:       { type: "integer", description: "Total calories (kcal)" },
      protein:        { type: "number",  description: "Protein in grams" },
      carbs:          { type: "number",  description: "Total carbohydrates in grams" },
      fat:            { type: "number",  description: "Total fat in grams" },
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
    required: ["name", "calories", "protein", "carbs", "fat", "fiber", "sugar", "saturated_fat", "sodium", "protein_quality", "carb_type", "confidence", "notes", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_b12_mcg", "calcium_mg", "iron_mg", "potassium_mg", "magnesium_mg"],
  },
};

function extractToolInput(response: Anthropic.Message): Record<string, unknown> | null {
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  return block.input as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    // Subscription gate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await checkAiAccess(user.id, user.email ?? "");
    if (!access.allowed) {
      return NextResponse.json({
        error: "Monthly AI limit reached. Upgrade to Pro for unlimited access.",
        upgrade: true,
        remaining: 0,
      }, { status: 402 });
    }

    const contentType = req.headers.get("content-type") || "";

    // TEXT / BRAND mode
    if (contentType.includes("application/json")) {
      const { description, brand, product, serving } = await req.json();

      let prompt = "";

      if (brand || product) {
        const servingNote = serving ? ` (serving size: ${serving})` : "";
        prompt = `Look up the nutrition facts for this branded food item and call log_nutrition with the values:
Brand: ${brand || "unknown"}
Product: ${product || "unknown"}${servingNote}

Use your knowledge of published nutrition labels. If you know the exact facts, use them. If estimating, set confidence to "low".`;
      } else if (description) {
        prompt = `A user described their meal as: "${description}"

Estimate the nutritional content and call log_nutrition with the values. Use typical serving sizes and standard recipes. If multiple items are described, sum all macros into one total. If vague, set confidence to "low".`;
      } else {
        return NextResponse.json({ error: "No input provided" }, { status: 400 });
      }

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001", // text/brand lookups — Haiku is fast and cheap
        max_tokens: 1024,
        system: "You are a nutrition database. Always call the log_nutrition tool with precise numerical values. Never refuse.",
        tools: [NUTRITION_TOOL],
        tool_choice: { type: "any" },
        messages: [{ role: "user", content: prompt }],
      });

      const input = extractToolInput(response);
      if (!input) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
      return NextResponse.json(input);
    }

    // IMAGE mode
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: "You are a nutrition database. Always call the log_nutrition tool with precise numerical values. Never refuse.",
      tools: [NUTRITION_TOOL],
      tool_choice: { type: "any" },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Analyze this food image and call log_nutrition with the estimated nutritional content. If you cannot identify the food, still call the tool with your best estimate and confidence set to \"low\"." },
        ],
      }],
    });

    const input = extractToolInput(response);
    if (!input) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    return NextResponse.json(input);

  } catch (err) {
    console.error("Food analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
