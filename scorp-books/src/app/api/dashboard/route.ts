import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, bankAccounts, companies } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { generateProfitLoss } from "@/lib/reports/profit-loss";

export async function GET() {
  const year = new Date().getFullYear();
  const periodStart = `${year}-01-01`;
  const periodEnd = new Date().toISOString().split("T")[0];

  // Check if setup is complete
  const company = await db.select().from(companies).limit(1);
  const setupComplete = company.length > 0;

  // Get P&L summary
  let totalIncome = 0;
  let totalExpenses = 0;
  let netIncome = 0;

  try {
    const pl = await generateProfitLoss(periodStart, periodEnd);
    totalIncome = pl.totalIncome;
    totalExpenses = pl.totalExpenses;
    netIncome = pl.netIncome;
  } catch {
    // No data yet
  }

  // Cash position = sum of all bank account balances (checking + savings - credit cards)
  const accounts = await db.select().from(bankAccounts);
  let cashPosition = 0;
  for (const acct of accounts) {
    if (acct.type === "credit_card") {
      cashPosition -= acct.currentBalance;
    } else {
      cashPosition += acct.currentBalance;
    }
  }

  // Unclassified count
  const unclassified = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.categoryId));

  return NextResponse.json({
    setupComplete,
    companyName: company[0]?.name || null,
    totalIncome,
    totalExpenses,
    netIncome,
    cashPosition,
    unclassifiedCount: unclassified.length,
    accountCount: accounts.length,
  });
}
