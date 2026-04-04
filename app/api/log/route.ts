export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log_entries, foods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayStr();

  const entries = await db.query.log_entries.findMany({
    where: (e, { eq }) => eq(e.date, date),
    with: { food_id: false },
    orderBy: (e, { asc }) => asc(e.created_at),
  });

  // Also fetch associated food names
  const withFoods = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.food_id) return { ...entry, food: null };
      const food = await db.query.foods.findFirst({
        where: (f, { eq }) => eq(f.id, entry.food_id!),
      });
      return { ...entry, food: food ?? null };
    })
  );

  return NextResponse.json(withFoods);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    food_id, date, meal, servings,
    calories, protein, carbs, fat, notes,
    // If no food_id, accept food data to cache first
    foodData,
  } = body;

  let resolvedFoodId = food_id;

  // Cache food from external source if not yet in DB
  if (!food_id && foodData) {
    const existing = foodData.external_id
      ? await db.query.foods.findFirst({
          where: (f, { eq }) => eq(f.external_id, foodData.external_id),
        })
      : null;

    if (existing) {
      resolvedFoodId = existing.id;
    } else {
      const [created] = await db.insert(foods).values(foodData).returning();
      resolvedFoodId = created.id;
    }
  }

  const [entry] = await db.insert(log_entries).values({
    food_id: resolvedFoodId,
    date: date ?? todayStr(),
    meal,
    servings: servings ?? 1,
    calories,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
    notes,
  }).returning();

  // Return with food info
  const food = resolvedFoodId
    ? await db.query.foods.findFirst({ where: (f, { eq }) => eq(f.id, resolvedFoodId) })
    : null;

  return NextResponse.json({ ...entry, food }, { status: 201 });
}
