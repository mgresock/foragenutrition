import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess } from "@/lib/subscription";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // Only accept extraContext from the client (free-form user input) — everything
    // else is fetched from the DB server-side so the client can't spoof it.
    const { extraContext } = await req.json().catch(() => ({}));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [{ data: logs }, { data: profile }] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("name, calories, protein_g, carbs_g, fat_g, logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", sevenDaysAgo.toISOString())
        .order("logged_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("goal, weight_kg, weekly_budget, goals, meals_per_week")
        .eq("id", user.id)
        .single(),
    ]);

    const safeLogs = logs ?? [];
    const avgCals = safeLogs.length
      ? Math.round(safeLogs.reduce((s, l) => s + (l.calories ?? 0), 0) / Math.max(safeLogs.length, 1))
      : 0;
    const avgProtein = safeLogs.length
      ? Math.round(safeLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0) / Math.max(safeLogs.length, 1))
      : 0;

    const budget = profile?.weekly_budget ?? null;
    const goals = profile?.goals ?? [];
    const weight = profile?.weight_kg ? `${profile.weight_kg}kg` : "unknown";

    const prompt = `You are a practical gym nutrition coach helping someone eat better without spending a lot.

User context:
- Goals: ${goals.length ? goals.join(", ") : "general health"}
- Weight: ${weight}
- Weekly grocery budget: ${budget ? `$${budget}` : "not set, assume moderate (~$80/week)"}
- Average daily calories from logs: ${avgCals || "not tracked yet"}
- Average daily protein from logs: ${avgProtein ? `${avgProtein}g` : "not tracked yet"}
- Recent meals: ${safeLogs.slice(0, 10).map((l) => l.name).join(", ") || "none yet"}${extraContext ? `\n- Additional context from user: "${String(extraContext).slice(0, 500)}"` : ""}

Return ONLY valid JSON with this exact shape:
{
  "date_label": "Today, [Day] [Month] [Date]",
  "tips": [
    {
      "type": "protein" | "calories" | "timing" | "budget" | "consistency" | "habit",
      "title": "Short title (4-6 words)",
      "body": "One direct, actionable sentence. Be specific and practical."
    }
  ],
  "meals": [
    {
      "name": "Meal name",
      "desc": "One line: what it is and why it works",
      "cost": 3.50,
      "calories": 520,
      "protein_g": 42,
      "carbs_g": 35,
      "fat_g": 14,
      "prep_time": "10 min",
      "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3", "ingredient 4"]
    }
  ]
}

Rules for tips (3 total):
- Reference the user's actual data when possible (their avg calories, protein, budget)
- Focus on simple habits that compound over time
- Be direct and specific, not generic

Rules for meals (4 total):
- Budget-friendly: each meal under $5 in ingredients
- High protein relative to calories (great for gym goals)
- Simple to make — 5 ingredients or fewer, 15 min or less
- Varied: breakfast, lunch, dinner, snack
- Include realistic cost estimate in USD for home cooking
- Calories and macros must be accurate`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: "You are a nutrition coach. Reply with valid JSON only. No markdown, no code blocks.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    console.error("Daily suggestions error:", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
