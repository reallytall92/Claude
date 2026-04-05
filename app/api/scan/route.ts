export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a nutrition label parser. The user will provide an image of a nutrition facts label.
Extract the information and return ONLY a valid JSON object with these fields (use null for any field not found):
{
  "name": "product name if visible, otherwise null",
  "serving_size": <number>,
  "serving_unit": "<unit string, e.g. 'g', 'oz', 'cup', 'Tbsp', 'piece'>",
  "serving_weight_grams": <number or null>,
  "calories": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>,
  "fiber_g": <number or null>,
  "sugar_g": <number or null>
}
For serving_weight_grams: if the serving unit is NOT grams and the label shows a gram equivalent (e.g. "2 Tbsp (30g)"), extract the gram weight (30 in this example). If the serving unit is already grams, set this to null. If no gram equivalent is shown, set to null.
Return ONLY the JSON object, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SYSTEM_PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 512,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  // Strip markdown code fences if present (e.g. ```json ... ```)
  const text = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json({
      name: parsed.name ?? null,
      serving_size: parsed.serving_size ?? 1,
      serving_unit: parsed.serving_unit ?? "serving",
      serving_weight_grams: parsed.serving_weight_grams ?? null,
      calories: parsed.calories ?? 0,
      protein: parsed.protein_g ?? 0,
      carbs: parsed.carbs_g ?? 0,
      fat: parsed.fat_g ?? 0,
      fiber: parsed.fiber_g ?? null,
      sugar: parsed.sugar_g ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse nutrition label", raw: text }, { status: 422 });
  }
}
