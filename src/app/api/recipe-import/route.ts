import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess } from "@/lib/subscription";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";

export const maxDuration = 60;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOL: Anthropic.Tool = {
  name: "extract_recipe",
  description: "Extract a recipe's title, servings, ingredient shopping list, and per-serving macros.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      servings: { type: "integer" },
      ingredients: {
        type: "array",
        description: "Shopping-list ingredients with quantities",
        items: { type: "object", properties: { item: { type: "string" }, quantity: { type: "string" } }, required: ["item", "quantity"] },
      },
      per_serving: {
        type: "object",
        properties: { calories: { type: "integer" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" } },
        required: ["calories", "protein", "carbs", "fat"],
      },
      found: { type: "boolean", description: "false if the page didn't contain a real recipe" },
    },
    required: ["title", "servings", "ingredients", "per_serving", "found"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();
    let target: URL;
    try { target = new URL(String(url)); if (!/^https?:$/.test(target.protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: "Enter a valid recipe URL." }, { status: 400 }); }

    const ck = cacheKey("recipe", target.href);
    const cached = await cacheGet<Record<string, unknown>>(ck);
    if (cached) return NextResponse.json({ ...cached, cached: true });

    const access = await checkAiAccess(user.id, user.email ?? "");
    if (!access.allowed) return NextResponse.json({ error: "Monthly AI limit reached.", upgrade: true }, { status: 402 });

    // Fetch + strip the page to text (cap so the prompt stays small)
    let text = "";
    try {
      const res = await fetch(target.href, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ForageBot/1.0)", Accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html = await res.text();
        text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{2,}/g, " ").trim().slice(0, 8000);
      }
    } catch { /* fall through — let the model say not found */ }

    if (text.length < 200) return NextResponse.json({ error: "Couldn't read that page. Try a different recipe link." }, { status: 422 });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1536,
      system: "You extract recipes from web page text. Always call extract_recipe. Estimate per-serving macros from the ingredients and servings. If the text has no real recipe, set found=false.",
      tools: [TOOL],
      tool_choice: { type: "tool", name: "extract_recipe" },
      messages: [{ role: "user", content: `Extract the recipe from this page (${target.href}):\n\n${text}` }],
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return NextResponse.json({ error: "Could not parse recipe" }, { status: 500 });
    const result = block.input as Record<string, unknown>;
    if (!result.found) return NextResponse.json({ error: "No recipe found on that page." }, { status: 422 });
    await cacheSet(ck, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Recipe import error:", err);
    return NextResponse.json({ error: "Recipe import failed." }, { status: 500 });
  }
}
