import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Parse this grocery receipt image. Extract all line items with prices and categorize them nutritionally. Reply in valid JSON only:
{
  "store": "store name",
  "total": number,
  "items": [
    {
      "name": "item name",
      "price": number,
      "category": "Protein|Carbs|Produce|Dairy|Fats|Snacks|Processed|Beverages|Other",
      "healthy": true|false|null
    }
  ],
  "aiInsight": "2-3 sentence nutrition analysis of this shopping trip with actionable suggestions"
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Receipt scan error:", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
