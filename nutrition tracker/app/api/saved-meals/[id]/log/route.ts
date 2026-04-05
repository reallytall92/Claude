export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saved_meal_items, foods, log_entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mealId = Number(id);
  const { meal, date } = await req.json() as { meal: string; date?: string };

  // Get all items with their food data
  const items = await db
    .select({
      food_id: saved_meal_items.food_id,
      servings: saved_meal_items.servings,
      calories: foods.calories,
      protein: foods.protein,
      carbs: foods.carbs,
      fat: foods.fat,
    })
    .from(saved_meal_items)
    .innerJoin(foods, eq(saved_meal_items.food_id, foods.id))
    .where(eq(saved_meal_items.saved_meal_id, mealId));

  const resolvedDate = date ?? todayStr();

  // Create log entries for each item
  const entries = await Promise.all(
    items.map(async (item) => {
      const [entry] = await db.insert(log_entries).values({
        food_id: item.food_id,
        date: resolvedDate,
        meal,
        servings: item.servings,
        calories: Math.round(item.calories * item.servings * 10) / 10,
        protein: Math.round(item.protein * item.servings * 10) / 10,
        carbs: Math.round(item.carbs * item.servings * 10) / 10,
        fat: Math.round(item.fat * item.servings * 10) / 10,
      }).returning();

      const food = await db.query.foods.findFirst({
        where: (f, { eq }) => eq(f.id, item.food_id),
      });

      return { ...entry, food: food ?? null };
    })
  );

  return NextResponse.json(entries, { status: 201 });
}
