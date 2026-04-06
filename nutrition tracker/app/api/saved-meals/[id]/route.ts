export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saved_meals, saved_meal_items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mealId = Number(id);
  const body = await req.json() as {
    name?: string;
    items?: Array<{ food_id: number; servings: number }>;
  };

  if (body.name) {
    await db.update(saved_meals).set({ name: body.name }).where(eq(saved_meals.id, mealId));
  }

  if (body.items) {
    await db.delete(saved_meal_items).where(eq(saved_meal_items.saved_meal_id, mealId));
    if (body.items.length > 0) {
      await db.insert(saved_meal_items).values(
        body.items.map((item, i) => ({
          saved_meal_id: mealId,
          food_id: item.food_id,
          servings: item.servings,
          sort_order: i,
        }))
      );
    }
  }

  const [meal] = await db.select().from(saved_meals).where(eq(saved_meals.id, mealId));
  return NextResponse.json(meal);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mealId = Number(id);

  // Delete items first (SQLite foreign key cascades may not be enabled)
  await db.delete(saved_meal_items).where(eq(saved_meal_items.saved_meal_id, mealId));
  await db.delete(saved_meals).where(eq(saved_meals.id, mealId));

  return NextResponse.json({ ok: true });
}
