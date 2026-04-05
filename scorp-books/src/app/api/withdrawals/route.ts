import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines, chartOfAccounts, bankAccounts } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year") || String(new Date().getFullYear());

  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.type, "distribution"),
        gte(journalEntries.date, `${yearParam}-01-01`)
      )
    )
    .orderBy(desc(journalEntries.date));

  const results = [];
  let ytdTotal = 0;

  for (const entry of entries) {
    const lines = await db
      .select({
        line: journalEntryLines,
        accountName: chartOfAccounts.friendlyName,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(eq(journalEntryLines.journalEntryId, entry.id));

    // The distribution amount is the debit to the distributions account
    const distLine = lines.find(
      (l) => l.line.debit > 0 && l.accountName === "Owner Withdrawals"
    );
    const amount = distLine ? distLine.line.debit : 0;
    ytdTotal += amount;

    results.push({
      ...entry,
      amount,
      lines: lines.map((l) => ({ ...l.line, accountName: l.accountName })),
    });
  }

  return NextResponse.json({ withdrawals: results, ytdTotal });
}

export async function POST(request: Request) {
  const data = await request.json();

  const entry = await db
    .insert(journalEntries)
    .values({
      date: data.date,
      memo: data.memo || `Owner withdrawal — ${data.date}`,
      type: "distribution",
    })
    .returning();

  const entryId = entry[0].id;

  // Find accounts
  const distAcct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "3040")).limit(1);
  const bankAcct = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(data.bankAccountId))).limit(1);

  const lines: { journalEntryId: number; accountId: number; debit: number; credit: number; memo: string }[] = [];

  // Debit distributions (reduces equity)
  if (distAcct.length > 0) {
    lines.push({
      journalEntryId: entryId,
      accountId: distAcct[0].id,
      debit: Number(data.amount),
      credit: 0,
      memo: "Owner withdrawal",
    });
  }

  // Credit bank account
  if (bankAcct.length > 0 && bankAcct[0].linkedAccountId) {
    lines.push({
      journalEntryId: entryId,
      accountId: bankAcct[0].linkedAccountId,
      debit: 0,
      credit: Number(data.amount),
      memo: "Owner withdrawal from bank",
    });
  }

  if (lines.length > 0) {
    await db.insert(journalEntryLines).values(lines);
  }

  return NextResponse.json({ id: entryId });
}
