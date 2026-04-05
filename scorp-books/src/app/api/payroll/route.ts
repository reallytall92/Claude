import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines, chartOfAccounts, bankAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const entries = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.type, "payroll"))
    .orderBy(desc(journalEntries.date));

  const results = [];
  for (const entry of entries) {
    const lines = await db
      .select({
        line: journalEntryLines,
        accountName: chartOfAccounts.friendlyName,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(eq(journalEntryLines.journalEntryId, entry.id));

    results.push({ ...entry, lines: lines.map((l) => ({ ...l.line, accountName: l.accountName })) });
  }

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const data = await request.json();

  // Create the journal entry
  const entry = await db
    .insert(journalEntries)
    .values({
      date: data.date,
      memo: data.memo || `Payroll run — ${data.date}`,
      type: "payroll",
    })
    .returning();

  const entryId = entry[0].id;

  // Find account IDs
  const salaryAcct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "5010")).limit(1);
  const taxAcct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "5020")).limit(1);
  const feeAcct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "5190")).limit(1);
  const bankAcct = await db.select().from(bankAccounts).where(eq(bankAccounts.id, Number(data.bankAccountId))).limit(1);

  const lines: { journalEntryId: number; accountId: number; debit: number; credit: number; memo: string }[] = [];

  // Debit salary expense
  if (data.grossWages && salaryAcct.length > 0) {
    lines.push({
      journalEntryId: entryId,
      accountId: salaryAcct[0].id,
      debit: Number(data.grossWages),
      credit: 0,
      memo: "Gross wages",
    });
  }

  // Debit employer payroll taxes
  if (data.employerTaxes && taxAcct.length > 0) {
    lines.push({
      journalEntryId: entryId,
      accountId: taxAcct[0].id,
      debit: Number(data.employerTaxes),
      credit: 0,
      memo: "Employer payroll taxes",
    });
  }

  // Debit payroll service fee
  if (data.serviceFee && Number(data.serviceFee) > 0 && feeAcct.length > 0) {
    lines.push({
      journalEntryId: entryId,
      accountId: feeAcct[0].id,
      debit: Number(data.serviceFee),
      credit: 0,
      memo: "Payroll service fee",
    });
  }

  // Credit checking account (total paid out)
  if (bankAcct.length > 0 && bankAcct[0].linkedAccountId) {
    const totalPaid =
      Number(data.grossWages || 0) +
      Number(data.employerTaxes || 0) +
      Number(data.serviceFee || 0);

    lines.push({
      journalEntryId: entryId,
      accountId: bankAcct[0].linkedAccountId,
      debit: 0,
      credit: totalPaid,
      memo: "Total payroll payment",
    });
  }

  if (lines.length > 0) {
    await db.insert(journalEntryLines).values(lines);
  }

  return NextResponse.json({ id: entryId, linesCreated: lines.length });
}
