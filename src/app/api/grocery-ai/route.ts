import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess } from "@/lib/subscription";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&countrycodes=US&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "ForageNutritionApp/1.0 (mcgresock@gmail.com)" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;
    const addr = data[0].address;
    const city = addr?.city || addr?.town || addr?.village || addr?.suburb || "";
    const state = addr?.state || "";
    return { city, state };
  } catch {
    return null;
  }
}

const GENERATE_TOOL: Anthropic.Tool = {
  name: "create_weekly_plan",
  description: "Create a practical 7-day meal plan and the exact grocery list needed to make every meal.",
  input_schema: {
    type: "object" as const,
    properties: {
      meal_plan: {
        type: "array",
        description: "One entry per day, Mon–Sun",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },
            breakfast: { type: "string" },
            lunch: { type: "string" },
            dinner: { type: "string" },
            snack: { type: "string" },
            approx_calories: { type: "number" },
            approx_protein_g: { type: "number" },
          },
          required: ["day", "breakfast", "lunch", "dinner", "approx_calories", "approx_protein_g"],
        },
      },
      items: {
        type: "array",
        description: "All grocery items needed for the week — specific products, realistic prices for the stores selected",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Specific product name (e.g. 'Chicken Breast 3lb bag', not just 'chicken')" },
            quantity: { type: "string", description: "How many / how much to buy for the week" },
            estimated_price: { type: "number", description: "Realistic price in USD for this store" },
            store: { type: "string", description: "Which store to buy this at" },
            category: {
              type: "string",
              enum: ["Protein", "Carbs", "Produce", "Dairy", "Fats", "Other"],
            },
            protein: { type: "number", description: "Total grams of protein in the full package (protein items only)" },
            reason: { type: "string", description: "One short phrase on why this is a smart buy (protein items only)" },
          },
          required: ["name", "quantity", "estimated_price", "store", "category"],
        },
      },
    },
    required: ["meal_plan", "items"],
  },
};

export async function POST(req: NextRequest) {
  try {
    // Auth gate — must be a logged-in user within their AI quota
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

    const body = await req.json();
    const { action, messages, userProfile, currentList } = body;

    if (action === "generate") {
      const budget = userProfile?.weekly_budget ? `$${userProfile.weekly_budget}` : "no strict budget";
      const goals = Array.isArray(userProfile?.goals) ? userProfile.goals.join(", ") : (userProfile?.goals || "build muscle / high protein");
      const meals = userProfile?.meals_per_week || 14;
      const weightKg = userProfile?.weight_kg;
      const zip = userProfile?.zip_code;
      const selectedStores: string[] = body.selectedStores ?? [];

      let locationLine = "";
      let storeContext: string;

      if (zip) {
        const location = await lookupZip(zip);
        if (location?.city) locationLine = `${location.city}, ${location.state}`;
      }

      if (selectedStores.length > 0) {
        storeContext = `The user shops at: ${selectedStores.join(", ")}. Assign EVERY grocery item to one of these exact store names. Distribute wisely — bulk protein/staples to warehouse clubs (Costco/Sam's), fresh produce to supermarkets, specialty items to health stores. Use exact store names as given.`;
      } else if (locationLine) {
        storeContext = `User is in ${locationLine}. Pick 2–3 realistic local grocery chains for that region. Examples: TX→HEB/Kroger/Walmart; FL/SE→Publix/Walmart; Northeast→Stop&Shop/Market Basket; Midwest→Kroger/Meijer/Aldi; CA→Ralphs/Trader Joe's/Vons; NW→Safeway/Fred Meyer.`;
      } else {
        storeContext = "Use common US chains (Walmart, Kroger, Aldi, Costco, Target).";
      }

      const proteinTarget = weightKg ? Math.round(weightKg * 2.2) : 180;

      const prompt = `Build a practical 7-day gym-focused meal plan and grocery list for this person:
- Goals: ${goals}
- Weekly budget: ${budget}
- Approx meals/week requested: ${meals}
- Location: ${locationLine || "US"}
- Weight: ${weightKg ? `${weightKg}kg` : "unknown"}
- Protein target: ~${proteinTarget}g/day

MEAL PLAN: Create 7 days of simple, repeatable meals a gym-goer would actually cook. Breakfast can repeat. Meals should use the grocery items you list. Aim for ~${proteinTarget}g protein/day.

GROCERY LIST: List every specific item needed (including cooking staples). Be specific with product sizes (e.g. "Chicken Breast 3lb bag" not "chicken"). Include realistic current prices for each store. Aim for 18–25 items total. ${storeContext}

Stay within the weekly budget. Focus on high protein-per-dollar: chicken breast, eggs, Greek yogurt, canned tuna/salmon, ground turkey, cottage cheese.`;

      let response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: "You are a gym nutrition assistant. You MUST call the create_weekly_plan tool with a complete 7-day meal plan and full grocery list. Never respond with plain text.",
        tools: [GENERATE_TOOL],
        tool_choice: { type: "tool", name: "create_weekly_plan" },
        messages: [{ role: "user", content: prompt }],
      });

      let toolBlock = response.content.find((b) => b.type === "tool_use");

      // Retry once if no tool block returned
      if (!toolBlock) {
        response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4000,
          system: "You are a gym nutrition assistant. You MUST call the create_weekly_plan tool. Fill every required field.",
          tools: [GENERATE_TOOL],
          tool_choice: { type: "tool", name: "create_weekly_plan" },
          messages: [{ role: "user", content: prompt }],
        });
        toolBlock = response.content.find((b) => b.type === "tool_use");
      }

      if (!toolBlock || toolBlock.type !== "tool_use") {
        return NextResponse.json({ error: "AI did not return structured data" }, { status: 500 });
      }

      const result = toolBlock.input as { meal_plan: unknown[]; items: unknown[] };
      return NextResponse.json(result);
    }

    // Chat action
    const systemPrompt = `You are a no-nonsense nutrition and grocery assistant for gym-goers focused on muscle and body composition.
User profile: ${JSON.stringify(userProfile || {})}
Current grocery list: ${JSON.stringify(currentList || [])}
Be concise and specific. Prioritize protein-dense, budget-friendly swaps. Keep replies under 3 sentences unless listing items.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: (messages || []).map((m: { role: string; text: string }) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      })),
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Grocery AI error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
