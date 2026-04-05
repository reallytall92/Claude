export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saved_meals, saved_meal_items, foods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const meals = await db.select().from(saved_meals).orderBy(saved_meals.created_at);

  const result = await Promise.all(
    meals.map(async (meal) => {
      const items = await db
        .select({
          id: saved_meal_items.id,
          food_id: saved_meal_items.food_id,
          servings: saved_meal_items.servings,
          sort_order: saved_meal_items.sort_order,
          food_name: foods.name,
          food_brand: foods.brand,
          food_calories: foods.calories,
          food_protein: foods.protein,
          food_carbs: foods.carbs,
          food_fat: foods.fat,
          food_serving_size: foods.serving_size,
          food_serving_unit: foods.serving_unit,
        })
        .from(saved_meal_items)
        .innerJoin(foods, eq(saved_meal_items.food_id, foods.id))
        .where(eq(saved_meal_items.saved_meal_id, meal.id))
        .orderBy(saved_meal_items.sort_order);

      const totals = items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.food_calories * item.servings,
          protein: acc.protein + item.food_protein * item.servings,
          carbs: acc.carbs + item.food_carbs * item.servings,
          fat: acc.fat + item.food_fat * item.servings,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return { ...meal, items, totals };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { name, items } = await req.json() as {
    name: string;
    items: Array<{ food_id: number; servings: number }>;
  };

  const [meal] = await db.insert(saved_meals).values({ name }).returning();

  const itemValues = items.map((item, i) => ({
    saved_meal_id: meal.id,
    food_id: item.food_id,
    servings: item.servings,
    sort_order: i,
  }));

  await db.insert(saved_meal_items).values(itemValues);

  return NextResponse.json(meal, { status: 201 });
}
