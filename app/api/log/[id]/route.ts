export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log_entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { servings, notes } = body;

  // Recalculate macros if servings changed
  let updates: Partial<typeof log_entries.$inferInsert> = { notes };
  if (servings != null) {
    const existing = await db.query.log_entries.findFirst({
      where: (e, { eq }) => eq(e.id, Number(id)),
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const food = existing.food_id
      ? await db.query.foods.findFirst({ where: (f, { eq }) => eq(f.id, existing.food_id!) })
      : null;

    if (food) {
      const ratio = servings / existing.servings;
      updates = {
        servings,
        calories: Math.round(existing.calories * ratio * 10) / 10,
        protein: Math.round(existing.protein * ratio * 10) / 10,
        carbs: Math.round(existing.carbs * ratio * 10) / 10,
        fat: Math.round(existing.fat * ratio * 10) / 10,
        notes,
      };
    } else {
      updates.servings = servings;
    }
  }

  const [updated] = await db
    .update(log_entries)
    .set(updates)
    .where(eq(log_entries.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(log_entries).where(eq(log_entries.id, Number(id)));
  return NextResponse.json({ ok: true });
}
