import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classificationRules, chartOfAccounts, transactions } from "@/lib/db/schema";
import { eq, desc, isNull, inArray } from "drizzle-orm";

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

  // Count unclassified transactions that match this rule (don't apply yet)
  const unclassified = await db
    .select({ id: transactions.id, description: transactions.description })
    .from(transactions)
    .where(isNull(transactions.categoryId));

  const pattern = data.pattern.toLowerCase();
  const pendingCount = unclassified
    .filter((t) => t.description.toLowerCase().includes(pattern))
    .length;

  return NextResponse.json({ ...result[0], pendingCount });
}

export async function PATCH(request: Request) {
  const data = await request.json();

  // Apply a rule retroactively to unclassified transactions
  if (data.action === "apply") {
    const rule = await db
      .select()
      .from(classificationRules)
      .where(eq(classificationRules.id, Number(data.id)))
      .limit(1);

    if (rule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const unclassified = await db
      .select({ id: transactions.id, description: transactions.description })
      .from(transactions)
      .where(isNull(transactions.categoryId));

    const pattern = rule[0].pattern.toLowerCase();
    const matchingIds = unclassified
      .filter((t) => t.description.toLowerCase().includes(pattern))
      .map((t) => t.id);

    if (matchingIds.length > 0) {
      await db
        .update(transactions)
        .set({
          categoryId: rule[0].categoryId,
          classificationSource: "rule",
        })
        .where(inArray(transactions.id, matchingIds));
    }

    return NextResponse.json({ ok: true, applied: matchingIds.length });
  }

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
