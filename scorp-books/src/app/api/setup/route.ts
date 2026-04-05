import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, bankAccounts, chartOfAccounts, journalEntries, journalEntryLines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const existing = await db.select().from(companies).limit(1);
  return NextResponse.json({ setupComplete: existing.length > 0, company: existing[0] ?? null });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { step, data } = body;

  if (step === "company") {
    // Upsert company info
    const existing = await db.select().from(companies).limit(1);
    if (existing.length > 0) {
      await db
        .update(companies)
        .set({
          name: data.name,
          ein: data.ein,
          state: data.state,
          entityType: data.entityType,
          formationDate: data.formationDate,
        })
        .where(eq(companies.id, existing[0].id));
    } else {
      await db.insert(companies).values({
        name: data.name,
        ein: data.ein,
        state: data.state,
        entityType: data.entityType,
        formationDate: data.formationDate,
      });
    }
    return NextResponse.json({ success: true });
  }

  if (step === "accounting") {
    const existing = await db.select().from(companies).limit(1);
    if (existing.length > 0) {
      await db
        .update(companies)
        .set({ accountingMethod: data.accountingMethod })
        .where(eq(companies.id, existing[0].id));
    }
    return NextResponse.json({ success: true });
  }

  if (step === "opening_balances") {
    // Create opening balance journal entry
    const entry = await db
      .insert(journalEntries)
      .values({
        date: data.asOfDate || new Date().toISOString().split("T")[0],
        memo: "Opening balances from prior tax return",
        type: "opening_balance",
      })
      .returning();

    const lines: { journalEntryId: number; accountId: number; debit: number; credit: number; memo: string }[] = [];

    // Retained Earnings / AAA (credit = equity increase)
    if (data.retainedEarnings && Number(data.retainedEarnings) !== 0) {
      const acct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "3030")).limit(1);
      if (acct.length > 0) {
        lines.push({
          journalEntryId: entry[0].id,
          accountId: acct[0].id,
          debit: 0,
          credit: Number(data.retainedEarnings),
          memo: "Prior year retained earnings / AAA",
        });
      }
    }

    // Common Stock
    if (data.commonStock && Number(data.commonStock) !== 0) {
      const acct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "3010")).limit(1);
      if (acct.length > 0) {
        lines.push({
          journalEntryId: entry[0].id,
          accountId: acct[0].id,
          debit: 0,
          credit: Number(data.commonStock),
          memo: "Common stock",
        });
      }
    }

    // Additional Paid-In Capital
    if (data.additionalCapital && Number(data.additionalCapital) !== 0) {
      const acct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "3020")).limit(1);
      if (acct.length > 0) {
        lines.push({
          journalEntryId: entry[0].id,
          accountId: acct[0].id,
          debit: 0,
          credit: Number(data.additionalCapital),
          memo: "Additional paid-in capital",
        });
      }
    }

    // Balancing debit to a suspense/equity offset — the bank account balances
    // will be entered in the next step and will complete the balance sheet
    const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
    if (totalCredits > 0) {
      // Debit checking as placeholder — will be adjusted when bank accounts are added
      const checkingAcct = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "1010")).limit(1);
      if (checkingAcct.length > 0) {
        lines.push({
          journalEntryId: entry[0].id,
          accountId: checkingAcct[0].id,
          debit: totalCredits,
          credit: 0,
          memo: "Opening balance offset — will be adjusted with bank account balances",
        });
      }
    }

    if (lines.length > 0) {
      await db.insert(journalEntryLines).values(lines);
    }

    return NextResponse.json({ success: true });
  }

  if (step === "bank_accounts") {
    // data.accounts is an array of { name, type, institution, last4, currentBalance }
    for (const acct of data.accounts) {
      // Find the matching chart of accounts entry
      let linkedCode = "1010"; // default to checking
      if (acct.type === "savings") linkedCode = "1020";
      if (acct.type === "credit_card") linkedCode = "2010";

      const linkedAcct = await db
        .select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.code, linkedCode))
        .limit(1);

      await db.insert(bankAccounts).values({
        name: acct.name,
        type: acct.type,
        institution: acct.institution || null,
        last4: acct.last4 || null,
        currentBalance: Number(acct.currentBalance) || 0,
        linkedAccountId: linkedAcct[0]?.id ?? null,
      });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
