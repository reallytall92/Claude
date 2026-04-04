export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foods } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(foods).orderBy(desc(foods.is_favorite), desc(foods.created_at));
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, brand, serving_size, serving_unit,
    calories, protein, carbs, fat, fiber, sugar,
    source, external_id,
  } = body;

  if (!name || calories == null) {
    return NextResponse.json({ error: "name and calories are required" }, { status: 400 });
  }

  // Upsert by external_id if provided (caching from USDA/OFF)
  if (external_id) {
    const existing = await db.query.foods.findFirst({
      where: (f, { eq }) => eq(f.external_id, external_id),
    });
    if (existing) return NextResponse.json(existing);
  }

  const [created] = await db.insert(foods).values({
    name, brand, serving_size, serving_unit,
    calories, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0,
    fiber, sugar, source: source ?? "custom", external_id,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
