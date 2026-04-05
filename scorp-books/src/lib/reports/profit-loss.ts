import { db } from "@/lib/db";
import { transactions, chartOfAccounts, journalEntryLines, journalEntries } from "@/lib/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

export type PLLineItem = {
  code: string;
  name: string;
  friendlyName: string;
  amount: number;
};

export type ProfitLossReport = {
  periodStart: string;
  periodEnd: string;
  income: PLLineItem[];
  expenses: PLLineItem[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
};

export async function generateProfitLoss(
  periodStart: string,
  periodEnd: string
): Promise<ProfitLossReport> {
  // Get all classified transactions in the period
  const txns = await db
    .select({
      amount: transactions.amount,
      type: transactions.type,
      categoryId: transactions.categoryId,
      categoryCode: chartOfAccounts.code,
      categoryName: chartOfAccounts.name,
      categoryFriendly: chartOfAccounts.friendlyName,
      categoryType: chartOfAccounts.type,
    })
    .from(transactions)
    .leftJoin(chartOfAccounts, eq(transactions.categoryId, chartOfAccounts.id))
    .where(
      and(
        gte(transactions.date, periodStart),
        lte(transactions.date, periodEnd),
        isNotNull(transactions.categoryId)
      )
    );

  // Get journal entry lines (payroll, etc.) in the period
  const jeLines = await db
    .select({
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountFriendly: chartOfAccounts.friendlyName,
      accountType: chartOfAccounts.type,
      entryDate: journalEntries.date,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        gte(journalEntries.date, periodStart),
        lte(journalEntries.date, periodEnd)
      )
    );

  // Aggregate by category
  const categoryTotals: Record<string, { code: string; name: string; friendlyName: string; type: string; amount: number }> = {};

  // Process transactions
  for (const txn of txns) {
    if (!txn.categoryCode || !txn.categoryType) continue;
    if (txn.categoryType !== "income" && txn.categoryType !== "expense") continue;

    const key = txn.categoryCode;
    if (!categoryTotals[key]) {
      categoryTotals[key] = {
        code: txn.categoryCode,
        name: txn.categoryName || "",
        friendlyName: txn.categoryFriendly || "",
        type: txn.categoryType,
        amount: 0,
      };
    }

    // For transactions: credits (income) are positive amounts, debits (expenses) are negative
    categoryTotals[key].amount += Math.abs(txn.amount);
  }

  // Process journal entry lines (only income/expense accounts)
  for (const line of jeLines) {
    if (!line.accountCode || !line.accountType) continue;
    if (line.accountType !== "income" && line.accountType !== "expense") continue;

    const key = line.accountCode;
    if (!categoryTotals[key]) {
      categoryTotals[key] = {
        code: line.accountCode,
        name: line.accountName || "",
        friendlyName: line.accountFriendly || "",
        type: line.accountType,
        amount: 0,
      };
    }

    // For journal entries: debits increase expenses, credits increase income
    if (line.accountType === "expense") {
      categoryTotals[key].amount += line.debit - line.credit;
    } else {
      categoryTotals[key].amount += line.credit - line.debit;
    }
  }

  const income: PLLineItem[] = [];
  const expenses: PLLineItem[] = [];

  for (const cat of Object.values(categoryTotals)) {
    if (cat.amount === 0) continue;
    const item = { code: cat.code, name: cat.name, friendlyName: cat.friendlyName, amount: cat.amount };
    if (cat.type === "income") {
      income.push(item);
    } else {
      expenses.push(item);
    }
  }

  income.sort((a, b) => a.code.localeCompare(b.code));
  expenses.sort((a, b) => a.code.localeCompare(b.code));

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, i) => s + i.amount, 0);

  return {
    periodStart,
    periodEnd,
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
  };
}
