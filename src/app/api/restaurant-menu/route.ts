import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess, getUserTier } from "@/lib/subscription";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB base64 string length limit

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOL: Anthropic.Tool = {
  name: "suggest_menu_items",
  description: "Suggest healthier menu items at a restaurant based on user goals and budget.",
  input_schema: {
    type: "object" as const,
    properties: {
      restaurant_name: { type: "string" },
      data_source: { type: "string", description: "Where the menu data came from: 'web_fetch', 'user_provided', 'training_data', or 'unknown'" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:          { type: "string" },
            category:      { type: "string" },
            calories:      { type: "integer" },
            protein_g:     { type: "number" },
            carbs_g:       { type: "number" },
            fat_g:         { type: "number" },
            sodium_mg:     { type: "integer" },
            price:         { type: "number" },
            customization: { type: "string" },
            why:           { type: "string" },
          },
          required: ["name", "category", "calories", "protein_g", "carbs_g", "fat_g", "sodium_mg", "price", "customization", "why"],
        },
      },
      tips:  { type: "array", items: { type: "string" } },
      avoid: { type: "array", items: { type: "string" } },
      menu_note: { type: "string", description: "Brief note if menu data is limited or uncertain" },
    },
    required: ["restaurant_name", "data_source", "confidence", "items", "tips", "avoid"],
  },
};

// Try to fetch real menu text from the restaurant's website or a menu aggregator
async function tryFetchMenuText(name: string, location: string): Promise<string | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const city = location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Sites to try — ordered by most likely to have real menu data
  const urls = [
    `https://www.allmenus.com/${city}/-/${slug}-/menu/`,
    `https://www.menupages.com/restaurants/${slug}/menu`,
    `https://www.grubhub.com/restaurant/${slug}-${city}/menu`,
    `https://www.doordash.com/store/${slug}-${city}/`,
    `https://www.yelp.com/menu/${slug}-${city}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      // Strip tags and collapse whitespace — keep only meaningful text
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Only use if the page seems to actually have menu content
      if (text.length > 500 && (
        /\$\d|\d+ cal|calories|protein|carb/i.test(text) ||
        /(appetizer|entree|sandwich|salad|bowl|burger|pasta|pizza|soup|side|dessert)/i.test(text)
      )) {
        // Return first 4000 chars — enough for Claude to work with
        return text.slice(0, 4000);
      }
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Auth gate
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

    // Only accept user-input fields from client — profile data fetched server-side
    const body = await req.json();
    const restaurant: string = (body.restaurant ?? "").toString().slice(0, 200);
    const location: string  = (body.location  ?? "").toString().slice(0, 200);
    const budget: number | null = typeof body.budget === "number" ? Math.min(Math.max(body.budget, 0), 500) : null;
    // Sanitize user-supplied text that goes into the AI prompt (prevent prompt injection)
    const pastedMenu: string = (body.pastedMenu ?? "").toString().replace(/[^\x20-\x7E\n\r\t]/g, "").slice(0, 5000);
    const menuImageBase64: string | null = body.menuImageBase64 ?? null;
    const menuImageType: string = body.menuImageType ?? "image/jpeg";

    if (!restaurant.trim()) return NextResponse.json({ error: "Restaurant name required" }, { status: 400 });

    // Photo scan is a Pro-only feature — enforce server-side regardless of client state
    if (menuImageBase64) {
      const tier = await getUserTier(user.id, user.email ?? "");
      if (tier !== "pro") {
        return NextResponse.json(
          { error: "Menu photo scanning is a Pro feature. Upgrade to access it.", upgrade: true },
          { status: 403 }
        );
      }
      // Validate image size (base64 expands ~33%, so 8MB base64 ≈ 6MB raw)
      if (menuImageBase64.length > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image too large. Maximum size is 6 MB." }, { status: 400 });
      }
    }

    // Fetch authoritative profile from DB — body stats live on `onboarding`, not `profiles`.
    const { data: obData } = await supabase
      .from("onboarding")
      .select("goals, weight_kg")
      .eq("user_id", user.id)
      .single();
    const goals: string[] = obData?.goals ?? [];
    const weight_kg: number | undefined = obData?.weight_kg ?? undefined;

    const budgetNote = budget ? `Budget: $${budget} for the meal.` : "No budget constraint — recommend the best options regardless of price.";
    const goalNote = goals?.length ? `User goals: ${goals.join(", ")}.` : "Focus on high protein and low calorie density.";
    const weightNote = weight_kg ? `User weighs ${weight_kg}kg.` : "";
    const locationNote = location?.trim() ? `Location: ${location.trim()}.` : "";

    let menuContext = "";
    let dataSource = "training_data";

    if (menuImageBase64) {
      // Image scan takes priority — Claude will read it directly
      dataSource = "user_provided";
    } else if (pastedMenu?.trim()) {
      menuContext = `\n\nMENU PROVIDED BY USER:\n${pastedMenu.slice(0, 5000)}`;
      dataSource = "user_provided";
    } else {
      const fetched = await tryFetchMenuText(restaurant, location || "");
      if (fetched) {
        menuContext = `\n\nMENU DATA FETCHED FROM WEB:\n${fetched}`;
        dataSource = "web_fetch";
      }
    }

    const promptText = `You are a sports nutrition advisor helping someone eat healthy at a specific restaurant.

Restaurant: "${restaurant}"
${locationNote}
${budgetNote}
${goalNote}
${weightNote}
${menuContext || ""}

${menuImageBase64
  ? "The user has provided a photo of the menu. Read every item and price from it carefully, then select the healthiest picks."
  : menuContext
    ? "Use the menu data above to identify real items and their nutritional content. Estimate macros if not listed."
    : `Use your knowledge of this restaurant. If it's a local/niche restaurant you're not certain about, set confidence to "low" and note what you do/don't know. Never make up menu items — if you don't know the menu, say so in menu_note and provide general guidance instead.`
}

Call suggest_menu_items with 4-6 healthy picks that fit the budget. Focus on: high protein, lower calorie density, real item names. Include practical order customizations.`;

    const userContent: Anthropic.MessageParam["content"] = menuImageBase64
      ? [
          {
            type: "image",
            source: { type: "base64", media_type: (menuImageType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: menuImageBase64 },
          },
          { type: "text", text: promptText },
        ]
      : promptText;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: "You are a sports nutrition advisor who helps people eat healthy at restaurants. Always call the suggest_menu_items tool. Be honest about your confidence level — never invent menu items you aren't sure about.",
      tools: [TOOL],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userContent }],
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return NextResponse.json({ error: "Could not analyze restaurant" }, { status: 500 });

    return NextResponse.json({ ...(block.input as Record<string, unknown>), data_source: dataSource });
  } catch (err) {
    console.error("Restaurant menu error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
