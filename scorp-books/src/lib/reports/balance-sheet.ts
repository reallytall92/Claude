import { db } from "@/lib/db";
import { chartOfAccounts, journalEntryLines, journalEntries, transactions, bankAccounts } from "@/lib/db/schema";
import { eq, lte } from "drizzle-orm";
import { generateProfitLoss } from "./profit-loss";

export type BSLineItem = {
  code: string;
  name: string;
  friendlyName: string;
  amount: number;
};

export type BalanceSheetReport = {
  asOfDate: string;
  assets: BSLineItem[];
  liabilities: BSLineItem[];
  equity: BSLineItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
};

export async function generateBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
  // Get all bank account balances as current asset/liability amounts
  const accounts = await db
    .select({
      bankAccount: bankAccounts,
      linkedCode: chartOfAccounts.code,
      linkedName: chartOfAccounts.name,
      linkedFriendly: chartOfAccounts.friendlyName,
      linkedType: chartOfAccounts.type,
    })
    .from(bankAccounts)
    .leftJoin(chartOfAccounts, eq(bankAccounts.linkedAccountId, chartOfAccounts.id));

  // Get all journal entry line balances up to asOfDate
  const jeLines = await db
    .select({
      accountId: journalEntryLines.accountId,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountFriendly: chartOfAccounts.friendlyName,
      accountType: chartOfAccounts.type,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(lte(journalEntries.date, asOfDate));

  // Get classified transactions for balance sheet accounts (liability, equity)
  const bsTxns = await db
    .select({
      amount: transactions.amount,
      txType: transactions.type,
      categoryCode: chartOfAccounts.code,
      categoryName: chartOfAccounts.name,
      categoryFriendly: chartOfAccounts.friendlyName,
      categoryType: chartOfAccounts.type,
    })
    .from(transactions)
    .innerJoin(chartOfAccounts, eq(transactions.categoryId, chartOfAccounts.id))
    .where(lte(transactions.date, asOfDate));

  // Aggregate account balances from journal entries
  const accountBalances: Record<string, { code: string; name: string; friendlyName: string; type: string; balance: number }> = {};

  for (const line of jeLines) {
    if (!line.accountCode || !line.accountType) continue;
    // Only include balance sheet accounts (asset, liability, equity)
    if (line.accountType !== "asset" && line.accountType !== "liability" && line.accountType !== "equity") continue;

    const key = line.accountCode;
    if (!accountBalances[key]) {
      accountBalances[key] = {
        code: line.accountCode,
        name: line.accountName || "",
        friendlyName: line.accountFriendly || "",
        type: line.accountType,
        balance: 0,
      };
    }

    // Assets: debit increases, credit decreases
    // Liabilities & Equity: credit increases, debit decreases
    if (line.accountType === "asset") {
      accountBalances[key].balance += line.debit - line.credit;
    } else {
      accountBalances[key].balance += line.credit - line.debit;
    }
  }

  // Add classified liability/equity transactions from the transactions table
  for (const txn of bsTxns) {
    if (!txn.categoryCode || !txn.categoryType) continue;
    if (txn.categoryType !== "liability" && txn.categoryType !== "equity") continue;

    const key = txn.categoryCode;
    if (!accountBalances[key]) {
      accountBalances[key] = {
        code: txn.categoryCode,
        name: txn.categoryName || "",
        friendlyName: txn.categoryFriendly || "",
        type: txn.categoryType,
        balance: 0,
      };
    }

    // Liabilities and equity have normal credit balances:
    // credit transactions increase the balance, debits decrease it
    if (txn.txType === "credit") {
      accountBalances[key].balance += txn.amount;
    } else {
      accountBalances[key].balance -= txn.amount;
    }
  }

  // Add bank account balances (these represent current cash positions)
  for (const acct of accounts) {
    if (!acct.linkedCode || !acct.linkedType) continue;
    const key = acct.linkedCode;
    if (!accountBalances[key]) {
      accountBalances[key] = {
        code: acct.linkedCode,
        name: acct.linkedName || "",
        friendlyName: acct.linkedFriendly || "",
        type: acct.linkedType,
        balance: 0,
      };
    }
    accountBalances[key].balance += acct.bankAccount.currentBalance;
  }

  // Get current year P&L net income to include in equity
  const yearStart = asOfDate.substring(0, 4) + "-01-01";
  const pl = await generateProfitLoss(yearStart, asOfDate);

  // Get prior year retained earnings (all P&L before current year)
  const priorYearEnd = String(parseInt(asOfDate.substring(0, 4)) - 1) + "-12-31";
  const priorPL = await generateProfitLoss("1900-01-01", priorYearEnd);

  const assets: BSLineItem[] = [];
  const liabilities: BSLineItem[] = [];
  const equity: BSLineItem[] = [];

  for (const acct of Object.values(accountBalances)) {
    if (acct.balance === 0) continue;
    const item = { code: acct.code, name: acct.name, friendlyName: acct.friendlyName, amount: acct.balance };
    if (acct.type === "asset") assets.push(item);
    else if (acct.type === "liability") liabilities.push(item);
    else if (acct.type === "equity") equity.push(item);
  }

  // Add prior year retained earnings to equity
  if (priorPL.netIncome !== 0) {
    equity.push({
      code: "RE",
      name: "Retained Earnings",
      friendlyName: "Prior Year Profits Kept in Business",
      amount: priorPL.netIncome,
    });
  }

  // Add current year net income to equity
  if (pl.netIncome !== 0) {
    equity.push({
      code: "NET",
      name: "Current Year Net Income",
      friendlyName: "This Year's Profit (or Loss)",
      amount: pl.netIncome,
    });
  }

  assets.sort((a, b) => a.code.localeCompare(b.code));
  liabilities.sort((a, b) => a.code.localeCompare(b.code));
  equity.sort((a, b) => a.code.localeCompare(b.code));

  const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  const totalEquity = equity.reduce((s, i) => s + i.amount, 0);

  return {
    asOfDate,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}
