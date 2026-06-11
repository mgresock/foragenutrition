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

    // Fetch logs and profile from DB server-side — never trust client-supplied data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [{ data: logs }, { data: profile }] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("name, calories, protein_g, carbs_g, fat_g, logged_at, nutrition_meta")
        .eq("user_id", user.id)
        .gte("logged_at", sevenDaysAgo.toISOString())
        .order("logged_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("goal, weight_kg, age, biological_sex")
        .eq("id", user.id)
        .single(),
    ]);

    const prompt = `You are a gym nutrition coach. Analyze this user's recent meal tracking data and give them 3 specific, actionable insights.

User profile: ${JSON.stringify(profile || {})}

Recent meal logs (last 7 days):
${JSON.stringify(logs || [])}

Return ONLY valid JSON, no other text:
{
  "insights": [
    {
      "type": "protein" | "calories" | "timing" | "consistency" | "carbs" | "fat" | "general",
      "title": "Short title (4-6 words)",
      "body": "One specific, actionable sentence based on their actual data."
    }
  ]
}

Rules:
- Base insights on actual patterns in the data (averages, gaps, timing, consistency)
- Be specific — mention actual numbers from their logs
- Focus on gym/performance outcomes
- Max 3 insights
- Tone: direct coach, not a therapist`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Insights error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
