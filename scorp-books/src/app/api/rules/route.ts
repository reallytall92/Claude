import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classificationRules, chartOfAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const rules = await db
    .select({
      rule: classificationRules,
      categoryName: chartOfAccounts.friendlyName,
    })
    .from(classificationRules)
    .leftJoin(chartOfAccounts, eq(classificationRules.categoryId, chartOfAccounts.id))
    .orderBy(desc(classificationRules.priority));

  return NextResponse.json(
    rules.map((r) => ({
      ...r.rule,
      categoryName: r.categoryName,
    }))
  );
}

export async function POST(request: Request) {
  const data = await request.json();

  const result = await db
    .insert(classificationRules)
    .values({
      pattern: data.pattern,
      categoryId: Number(data.categoryId),
      priority: data.priority || 0,
      createdFromTransactionId: data.transactionId ? Number(data.transactionId) : null,
    })
    .returning();

  return NextResponse.json(result[0]);
}

export async function PATCH(request: Request) {
  const data = await request.json();
  const updates: Record<string, unknown> = {};
  if (data.pattern !== undefined) updates.pattern = data.pattern;
  if (data.categoryId !== undefined) updates.categoryId = Number(data.categoryId);

  await db
    .update(classificationRules)
    .set(updates)
    .where(eq(classificationRules.id, Number(data.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const data = await request.json();
  await db
    .delete(classificationRules)
    .where(eq(classificationRules.id, Number(data.id)));
  return NextResponse.json({ ok: true });
}

// Find matching rule for a description
export async function PUT(request: Request) {
  const data = await request.json();
  const description = (data.description || "").toLowerCase();

  const allRules = await db
    .select()
    .from(classificationRules)
    .orderBy(desc(classificationRules.priority));

  for (const rule of allRules) {
    if (description.includes(rule.pattern.toLowerCase())) {
      return NextResponse.json({ match: true, categoryId: rule.categoryId, ruleId: rule.id });
    }
  }

  return NextResponse.json({ match: false });
}
