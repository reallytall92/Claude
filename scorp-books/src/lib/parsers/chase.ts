export type ParsedTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  rawDescription: string;
  amount: number;
  type: "debit" | "credit";
  section: string;
};

export type VerificationWarning = {
  type: "section_mismatch" | "balance_mismatch" | "missing_total";
  message: string;
  expected: number;
  actual: number;
  section?: string;
};

export type ParsedStatement = {
  accountNumber: string;
  periodStart: string;
  periodEnd: string;
  beginningBalance: number;
  endingBalance: number;
  transactions: ParsedTransaction[];
  verification: {
    passed: boolean;
    warnings: VerificationWarning[];
  };
};

/**
 * Parse a Chase "accessible PDF" bank statement.
 *
 * IMPORTANT: pdf-parse extracts text WITHOUT spaces between columns.
 * So "DATE  DESCRIPTION  AMOUNT" becomes "DATEDESCRIPTIONAMOUNT"
 * and "02/06  Orig CO Name:..." becomes "02/06Orig CO Name:..."
 * and amounts appear as "CO Entry $7,755.00" or just "10,000.00" at end of line.
 */
export function parseChaseStatement(text: string, year?: number): ParsedStatement {
  // Extract period
  const periodMatch = text.match(
    /(\w+ \d{1,2}, \d{4})\s+through\s+(\w+ \d{1,2}, \d{4})/
  );
  let periodStart = "";
  let periodEnd = "";
  let statementYear = year || new Date().getFullYear();

  if (periodMatch) {
    const startDate = new Date(periodMatch[1]);
    const endDate = new Date(periodMatch[2]);
    periodStart = startDate.toISOString().split("T")[0];
    periodEnd = endDate.toISOString().split("T")[0];
    statementYear = endDate.getFullYear();
  }

  // Extract account number
  const accountMatch = text.match(/Account\s*Number:\s*(\d+)/);
  const accountNumber = accountMatch ? accountMatch[1] : "";

  // Extract beginning and ending balance
  // Text format: "Beginning Balance$39,890.35" (no space before $)
  let beginningBalance = 0;
  let endingBalance = 0;

  const beginningMatch = text.match(/Beginning Balance\$?([\d,]+\.\d{2})/);
  if (beginningMatch) {
    beginningBalance = parseAmount(beginningMatch[1]);
  }

  // "Ending Balance9$28,647.05" (instance count jammed in)
  const endingMatch = text.match(/Ending Balance\d+\$?([\d,]+\.\d{2})/);
  if (endingMatch) {
    endingBalance = parseAmount(endingMatch[1]);
  }

  // Parse transactions from each section
  // Strategy: find all DATEDESCRIPTIONAMOUNT column headers, then look at the
  // section title that immediately precedes each one to determine the section type.
  const transactions: ParsedTransaction[] = [];
  const columnHeader = "DATEDESCRIPTIONAMOUNT";
  let searchFrom = 0;

  while (true) {
    const headerPos = text.indexOf(columnHeader, searchFrom);
    if (headerPos === -1) break;

    // Look at the ~200 chars before this header to find the section title
    const before = text.substring(Math.max(0, headerPos - 200), headerPos);

    let type: "debit" | "credit" = "debit";
    let sectionName = "UNKNOWN";

    if (/DEPOSITS AND ADDITIONS/i.test(before)) {
      type = "credit";
      sectionName = "DEPOSITS AND ADDITIONS";
    } else if (/ATM\s*&\s*DEBIT CARD WITHDRAWALS/i.test(before)) {
      type = "debit";
      sectionName = "ATM & DEBIT CARD WITHDRAWALS";
    } else if (/ELECTRONIC WITHDRAWALS/i.test(before)) {
      type = "debit";
      sectionName = "ELECTRONIC WITHDRAWALS";
    }

    if (sectionName !== "UNKNOWN") {
      const startIdx = headerPos + columnHeader.length;
      const txns = parseSectionFromIndex(text, startIdx, type, sectionName, statementYear);
      transactions.push(...txns);
    }

    searchFrom = headerPos + columnHeader.length;
  }

  // ── Verification ──────────────────────────────────────────────────
  const warnings: VerificationWarning[] = [];

  // 1. Verify each section total against stated total in the PDF
  const sectionTotalPatterns: Record<string, RegExp> = {
    "DEPOSITS AND ADDITIONS": /Total Deposits and Additions\s*\$?([\d,]+\.\d{2})/,
    "ATM & DEBIT CARD WITHDRAWALS": /Total ATM\s*&\s*Debit Card Withdrawals\s*\$?([\d,]+\.\d{2})/,
    "ELECTRONIC WITHDRAWALS": /Total Electronic Withdrawals\s*\$?([\d,]+\.\d{2})/,
  };

  for (const [section, pattern] of Object.entries(sectionTotalPatterns)) {
    const match = text.match(pattern);
    if (!match) continue;

    const statedTotal = parseAmount(match[1]);
    const sectionTxns = transactions.filter((t) => t.section === section);
    const parsedTotal = round2(sectionTxns.reduce((sum, t) => sum + t.amount, 0));

    if (Math.abs(parsedTotal - statedTotal) > 0.01) {
      warnings.push({
        type: "section_mismatch",
        message: `${section}: parsed $${parsedTotal.toFixed(2)} but statement says $${statedTotal.toFixed(2)}`,
        expected: statedTotal,
        actual: parsedTotal,
        section,
      });
    }
  }

  // 2. Verify overall balance: beginning + deposits - withdrawals = ending
  const totalCredits = round2(
    transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0)
  );
  const totalDebits = round2(
    transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0)
  );
  const computedEnding = round2(beginningBalance + totalCredits - totalDebits);

  if (Math.abs(computedEnding - endingBalance) > 0.01) {
    warnings.push({
      type: "balance_mismatch",
      message: `Balance check: $${beginningBalance.toFixed(2)} + $${totalCredits.toFixed(2)} - $${totalDebits.toFixed(2)} = $${computedEnding.toFixed(2)}, but statement ending balance is $${endingBalance.toFixed(2)}`,
      expected: endingBalance,
      actual: computedEnding,
    });
  }

  return {
    accountNumber,
    periodStart,
    periodEnd,
    beginningBalance,
    endingBalance,
    transactions,
    verification: {
      passed: warnings.length === 0,
      warnings,
    },
  };
}

/**
 * Extract the transaction amount from the end of a line.
 *
 * pdf-parse often jams "Card XXXX" right against the dollar amount, e.g.:
 *   "Card Purchase 12/19 Sp Flux Footwear LLC Fluxfootwear. TX Card 6420167.57"
 * where "6420" is the card number and "167.57" is the actual amount.
 *
 * Strategy: first try to match the "Card NNNN" + amount pattern, which
 * separates the 4-digit card suffix from the amount. Fall back to the
 * simple trailing-number regex for lines without a card number.
 */
function extractAmount(text: string): { amount: number; desc: string } | null {
  // Pattern 1: "Card NNNN" jammed against amount — "Card 6420167.57"
  // The card number is always 4 digits. The amount follows immediately.
  const cardAmtMatch = text.match(/^(.*Card \d{4})\$?([\d,]+\.\d{2})$/);
  if (cardAmtMatch) {
    return {
      amount: parseAmount(cardAmtMatch[2]),
      desc: cardAmtMatch[1].trim(),
    };
  }

  // Pattern 2: normal trailing amount (with optional $ sign)
  const amtMatch = text.match(/\$?([\d,]+\.\d{2})$/);
  if (amtMatch) {
    return {
      amount: parseAmount(amtMatch[1]),
      desc: text.substring(0, text.lastIndexOf(amtMatch[0])).trim(),
    };
  }

  return null;
}

function parseSectionFromIndex(
  text: string,
  startIdx: number,
  type: "debit" | "credit",
  sectionName: string,
  year: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Find end of section — "Total" line with a dollar amount
  const afterHeader = text.substring(startIdx);
  const totalMatch = afterHeader.match(/^Total .+\$?[\d,]+\.\d{2}/m);
  const endIdx = totalMatch ? startIdx + totalMatch.index! : startIdx + 3000;

  const sectionText = text.substring(startIdx, endIdx);
  const lines = sectionText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Transaction lines start with MM/DD immediately followed by description (no space).
  // e.g. "02/06Orig CO Name:328528 Trident A..."
  // e.g. "02/23Card Purchase 02/21 SC Nursing Board..."
  // e.g. "02/0302/03 Online Realtime Transfer To..."
  // Amounts appear at end of a line as "$X,XXX.XX" or "X,XXX.XX"
  //
  // IMPORTANT: pdf-parse jams "Card XXXX" right against the amount, e.g.
  // "Card 6420167.57" where 6420 is the card number and 167.57 is the amount.
  // We handle this by first trying to split off a known "Card XXXX" suffix,
  // then extracting the amount from what remains.
  const dateStartRegex = /^(\d{2}\/\d{2})(.*)/;
  const amountAtEndRegex = /\$?([\d,]+\.\d{2})$/;

  let currentDate = "";
  let currentDescLines: string[] = [];
  let currentAmount: number | null = null;

  function flushTransaction() {
    if (currentDate && (currentDescLines.length > 0 || currentAmount !== null) && currentAmount !== null) {
      const rawDescription = currentDescLines.join(" ").trim();
      const cleanDescription = cleanChaseDescription(rawDescription);

      const [month, day] = currentDate.split("/");
      const dateStr = `${year}-${month}-${day}`;

      transactions.push({
        date: dateStr,
        description: cleanDescription,
        rawDescription,
        amount: currentAmount,
        type,
        section: sectionName,
      });
    }
    currentDate = "";
    currentDescLines = [];
    currentAmount = null;
  }

  for (const line of lines) {
    const dateMatch = line.match(dateStartRegex);

    if (dateMatch) {
      // Flush previous transaction
      flushTransaction();

      currentDate = dateMatch[1];
      const rest = dateMatch[2];

      // Check if amount is at end of this line
      const extracted = extractAmount(rest);
      if (extracted) {
        currentAmount = extracted.amount;
        if (extracted.desc) currentDescLines.push(extracted.desc);
      } else {
        if (rest) currentDescLines.push(rest);
      }
    } else if (currentDate) {
      // Continuation line — could be more description or the amount line
      const extracted = extractAmount(line);
      if (extracted) {
        if (currentAmount === null) {
          currentAmount = extracted.amount;
        }
        if (extracted.desc) currentDescLines.push(extracted.desc);
      } else {
        currentDescLines.push(line);
      }
    }
  }

  flushTransaction();
  return transactions;
}

/**
 * Clean up Chase's verbose ACH descriptions into something readable.
 *
 * Input examples (from pdf-parse, no column spacing):
 * - "Orig CO Name:328528 Trident A Orig ID:1364227403 Desc Date:260206 Descr:Payroll..."
 * - "Card Purchase 02/21 SC Nursing Board 803-896-4550 SC Card 6420"
 * - "02/03 Online Realtime Transfer To Kret Personal 5750 Transaction#: 27935194360..."
 * - "Orig CO Name:Gusto Orig ID:9138864007 Desc Date:260202 CO Entry Descr:Fee..."
 */
function cleanChaseDescription(raw: string): string {
  // ACH/Electronic entry: "Orig CO Name:XXX ... Descr:YYY"
  const origMatch = raw.match(/Orig CO Name:(.+?)\s+Orig ID:/);
  const descrMatch = raw.match(/Descr:(\w+)/);
  if (origMatch) {
    let company = origMatch[1].trim();
    // Remove numeric prefix if present (e.g., "328528 Trident A" → "Trident A")
    company = company.replace(/^\d+\s+/, "");
    const descr = descrMatch ? descrMatch[1] : "";

    if (descr && descr !== "Draft" && descr !== "CO") {
      return `${company} — ${descr}`;
    }

    // Look for Ind Name
    const indMatch = raw.match(/Ind Name:(.+?)(?:\s+Trn:|\s+\d+Sec:)/);
    if (indMatch) {
      return `${company} — ${indMatch[1].trim()}`;
    }
    return company;
  }

  // Card purchase: "Card Purchase MM/DD MERCHANT PHONE Card XXXX"
  const cardMatch = raw.match(/Card Purchase\s+\d{2}\/\d{2}\s+(.+?)(?:\s+\d{3}-\d{3}-\d{4}|\s+Card\s+\d{4})/);
  if (cardMatch) {
    return cardMatch[1].trim();
  }

  // Online transfer: "MM/DD Online Realtime Transfer To NAME XXXX Transaction#..."
  const transferMatch = raw.match(
    /Online Realtime Transfer To\s+(.+?)\s+\d{4}\s+Transaction/
  );
  if (transferMatch) {
    return `Transfer to ${transferMatch[1].trim()}`;
  }

  // Fallback
  return raw.length > 60 ? raw.substring(0, 60).trim() + "..." : raw;
}

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ""));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
