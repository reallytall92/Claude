export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saved_meals, saved_meal_items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json() as { name: string };
  const [updated] = await db.update(saved_meals).set({ name }).where(eq(saved_meals.id, Number(id))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mealId = Number(id);

  // Delete items first (SQLite foreign key cascades may not be enabled)
  await db.delete(saved_meal_items).where(eq(saved_meal_items.saved_meal_id, mealId));
  await db.delete(saved_meals).where(eq(saved_meals.id, mealId));

  return NextResponse.json({ ok: true });
}
