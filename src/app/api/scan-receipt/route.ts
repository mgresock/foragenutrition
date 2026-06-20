import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiAccess, getUserTier } from "@/lib/subscription";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(req: NextRequest) {
  try {
    // Auth gate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Receipt scanning is a Pro-only feature — enforce server-side
    const tier = await getUserTier(user.id, user.email ?? "");
    if (tier !== "pro") {
      return NextResponse.json(
        { error: "Receipt scanning is a Pro feature. Upgrade to access it.", upgrade: true },
        { status: 403 }
      );
    }

    const access = await checkAiAccess(user.id, user.email ?? "");
    if (!access.allowed) {
      return NextResponse.json({
        error: "Monthly AI limit reached. Upgrade to Pro for unlimited access.",
        upgrade: true,
        remaining: 0,
      }, { status: 402 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Upload a JPEG, PNG, or WebP image." }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

    const response = await client.messages.create({
      model: "claude-opus-4-8",
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
