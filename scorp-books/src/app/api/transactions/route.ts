import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, chartOfAccounts, bankAccounts } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, like, isNull, isNotNull, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "all";
  const accountId = url.searchParams.get("accountId");
  const categoryId = url.searchParams.get("categoryId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const search = url.searchParams.get("search");

  const conditions = [];

  if (tab === "needs_review") {
    conditions.push(isNull(transactions.categoryId));
  } else if (tab === "needs_verification") {
    conditions.push(eq(transactions.classificationSource, "rule"));
  } else if (tab === "reconciled") {
    conditions.push(eq(transactions.reconciled, true));
  }

  if (accountId) {
    conditions.push(eq(transactions.accountId, Number(accountId)));
  }
  if (categoryId) {
    conditions.push(eq(transactions.categoryId, Number(categoryId)));
  }
  if (dateFrom) {
    conditions.push(gte(transactions.date, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(transactions.date, dateTo));
  }
  if (search) {
    conditions.push(like(transactions.description, `%${search}%`));
  }

  const query = conditions.length > 0
    ? db
        .select({
          transaction: transactions,
          categoryName: chartOfAccounts.friendlyName,
          categoryCode: chartOfAccounts.code,
          accountName: bankAccounts.name,
        })
        .from(transactions)
        .leftJoin(chartOfAccounts, eq(transactions.categoryId, chartOfAccounts.id))
        .leftJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.date))
    : db
        .select({
          transaction: transactions,
          categoryName: chartOfAccounts.friendlyName,
          categoryCode: chartOfAccounts.code,
          accountName: bankAccounts.name,
        })
        .from(transactions)
        .leftJoin(chartOfAccounts, eq(transactions.categoryId, chartOfAccounts.id))
        .leftJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
        .orderBy(desc(transactions.date));

  const results = await query;

  // Get counts for tabs
  const allCount = await db.select().from(transactions);
  const needsReview = allCount.filter((t) => t.categoryId === null);
  const needsVerification = allCount.filter((t) => t.classificationSource === "rule");
  const reconciled = allCount.filter((t) => t.reconciled);

  return NextResponse.json({
    transactions: results.map((r) => ({
      ...r.transaction,
      categoryName: r.categoryName,
      categoryCode: r.categoryCode,
      accountName: r.accountName,
    })),
    counts: {
      all: allCount.length,
      needsReview: needsReview.length,
      needsVerification: needsVerification.length,
      reconciled: reconciled.length,
    },
  });
}

export async function POST(request: Request) {
  const data = await request.json();

  const result = await db
    .insert(transactions)
    .values({
      date: data.date,
      amount: Number(data.amount),
      description: data.description,
      rawDescription: data.rawDescription || data.description,
      accountId: Number(data.accountId),
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      type: data.type,
      source: data.source || "manual",
      classificationSource: data.categoryId ? "manual" : null,
      notes: data.notes || null,
    })
    .returning();

  return NextResponse.json(result[0]);
}

export async function PUT(request: Request) {
  const data = await request.json();

  // Bulk verify: approve all rule-classified transactions
  if (data.action === "bulk_verify" && Array.isArray(data.ids)) {
    await db
      .update(transactions)
      .set({ classificationSource: "verified" })
      .where(inArray(transactions.id, data.ids.map(Number)));
    return NextResponse.json({ success: true, verified: data.ids.length });
  }

  const updates: Record<string, unknown> = {};

  if (data.categoryId !== undefined) {
    updates.categoryId = data.categoryId ? Number(data.categoryId) : null;
    updates.classificationSource = data.categoryId ? (data.classificationSource || "manual") : null;
  }
  if (data.classificationSource !== undefined && data.categoryId === undefined) {
    updates.classificationSource = data.classificationSource;
  }
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.reconciled !== undefined) updates.reconciled = data.reconciled;
  if (data.description !== undefined) updates.description = data.description;

  await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, data.id));

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(transactions).where(eq(transactions.id, Number(id)));
  return NextResponse.json({ success: true });
}
