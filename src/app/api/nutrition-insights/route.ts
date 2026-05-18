import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { logs, profile } = await req.json();

    const prompt = `You are a gym nutrition coach. Analyze this user's recent meal tracking data and give them 3 specific, actionable insights.

User profile: ${JSON.stringify(profile || {})}

Recent meal logs (last 7 days):
${JSON.stringify(logs)}

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
