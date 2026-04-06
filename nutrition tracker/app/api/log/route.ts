export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log_entries, foods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayStr();

  const rows = await db
    .select({
      id: log_entries.id,
      food_id: log_entries.food_id,
      date: log_entries.date,
      meal: log_entries.meal,
      servings: log_entries.servings,
      calories: log_entries.calories,
      protein: log_entries.protein,
      carbs: log_entries.carbs,
      fat: log_entries.fat,
      notes: log_entries.notes,
      created_at: log_entries.created_at,
      food_name: foods.name,
      food_brand: foods.brand,
      food_serving_size: foods.serving_size,
      food_serving_unit: foods.serving_unit,
    })
    .from(log_entries)
    .leftJoin(foods, eq(log_entries.food_id, foods.id))
    .where(eq(log_entries.date, date))
    .orderBy(log_entries.created_at);

  const withFoods = rows.map((r) => ({
    id: r.id,
    food_id: r.food_id,
    date: r.date,
    meal: r.meal,
    servings: r.servings,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    notes: r.notes,
    created_at: r.created_at,
    food: r.food_name
      ? { name: r.food_name, brand: r.food_brand, serving_size: r.food_serving_size, serving_unit: r.food_serving_unit }
      : null,
  }));

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
