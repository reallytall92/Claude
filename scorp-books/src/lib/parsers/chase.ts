export type ParsedTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  rawDescription: string;
  amount: number;
  type: "debit" | "credit";
  section: string;
  /** True if the amount has no $, no comma, and < $1,000 — may have a jammed instance count */
  suspectAmount?: boolean;
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

  // "Ending Balance9$28,647.05" or "Ending Balance 8$45,681.69" (instance count jammed in)
  const endingMatch = text.match(/Ending Balance\s*\d+\$?([\d,]+\.\d{2})/);
  if (endingMatch) {
    endingBalance = parseAmount(endingMatch[1]);
  }

  // Parse transactions from each section
  // Strategy: find all DATEDESCRIPTIONAMOUNT column headers, then look at the
  // section title that immediately precedes each one to determine the section type.
  // Savings statements have DATEDESCRIPTIONAMOUNTBALANCE (extra BALANCE column).
  const transactions: ParsedTransaction[] = [];
  const columnHeader = "DATEDESCRIPTIONAMOUNT";
  let searchFrom = 0;

  while (true) {
    const headerPos = text.indexOf(columnHeader, searchFrom);
    if (headerPos === -1) break;

    // Check if this is a savings section (has BALANCE column after AMOUNT)
    const hasBalance = text.substring(headerPos, headerPos + 28) === "DATEDESCRIPTIONAMOUNTBALANCE";
    const headerLen = hasBalance ? 28 : columnHeader.length;

    // Look at the ~200 chars before this header to find the section title.
    // Use the LAST match (closest to the header) because the lookback window
    // can contain earlier section names (e.g. "Total Deposits and Additions"
    // appears before the "ELECTRONIC WITHDRAWALS" header).
    const before = text.substring(Math.max(0, headerPos - 200), headerPos);

    const sectionCandidates: { name: string; type: "debit" | "credit"; pos: number }[] = [];

    const sections: { pattern: RegExp; name: string; type: "debit" | "credit" }[] = [
      { pattern: /DEPOSITS AND ADDITIONS/gi, name: "DEPOSITS AND ADDITIONS", type: "credit" },
      { pattern: /ATM\s*&\s*DEBIT CARD WITHDRAWALS/gi, name: "ATM & DEBIT CARD WITHDRAWALS", type: "debit" },
      { pattern: /ELECTRONIC WITHDRAWALS/gi, name: "ELECTRONIC WITHDRAWALS", type: "debit" },
      { pattern: /FEES/gi, name: "FEES", type: "debit" },
    ];

    for (const sec of sections) {
      let m;
      while ((m = sec.pattern.exec(before)) !== null) {
        // Skip matches that are part of "Total ..." lines (those indicate
        // the END of a section, not the start of a new one)
        const lineStart = before.lastIndexOf("\n", m.index) + 1;
        const linePrefix = before.substring(lineStart, m.index);
        if (/Total\s/i.test(linePrefix)) continue;

        sectionCandidates.push({ name: sec.name, type: sec.type, pos: m.index });
      }
    }

    // Pick the match closest to the header (highest position)
    sectionCandidates.sort((a, b) => b.pos - a.pos);
    const best = sectionCandidates[0];

    let type: "debit" | "credit" = best?.type ?? "debit";
    let sectionName = best?.name ?? "UNKNOWN";

    const startIdx = headerPos + headerLen;
    if (sectionName === "UNKNOWN") {
      sectionName = hasBalance ? "SAVINGS" : "OTHER";
    }

    if (hasBalance) {
      // Savings format: each line has AMOUNT + BALANCE jammed together.
      // Use balance-aware parser that strips trailing balance first.
      const txns = parseSavingsSectionFromIndex(text, startIdx, sectionName, statementYear, beginningBalance);
      transactions.push(...txns);
    } else {
      const txns = parseSectionFromIndex(text, startIdx, type, sectionName, statementYear);
      transactions.push(...txns);
    }

    searchFrom = headerPos + headerLen;
  }

  // ── Verification & Reconciliation ─────────────────────────────────
  const warnings: VerificationWarning[] = [];

  // 1. Verify each section total against stated total in the PDF.
  //    If there's a mismatch, try reconciling suspect amounts (amounts
  //    without $ or comma that may have a jammed instance count digit).
  const sectionTotalPatterns: Record<string, RegExp> = {
    "DEPOSITS AND ADDITIONS": /Total Deposits and Additions\s*\$?([\d,]+\.\d{2})/,
    "ATM & DEBIT CARD WITHDRAWALS": /Total ATM\s*&\s*Debit Card Withdrawals\s*\$?([\d,]+\.\d{2})/,
    "ELECTRONIC WITHDRAWALS": /Total Electronic Withdrawals\s*\$?([\d,]+\.\d{2})/,
    "FEES": /Total Fees\s*\$?([\d,]+\.\d{2})/,
  };

  for (const [section, pattern] of Object.entries(sectionTotalPatterns)) {
    const match = text.match(pattern);
    if (!match) continue;

    const statedTotal = parseAmount(match[1]);
    const sectionTxns = transactions.filter((t) => t.section === section);
    let parsedTotal = round2(sectionTxns.reduce((sum, t) => sum + t.amount, 0));

    // Reconciliation: if totals don't match, check if stripping a leading
    // digit from any single suspect amount fixes it. This handles the case
    // where pdf-parse jams an instance count before a small amount
    // (e.g. "142.00" is really instance "1" + amount "42.00").
    if (Math.abs(parsedTotal - statedTotal) > 0.01) {
      const diff = round2(parsedTotal - statedTotal);
      let reconciled = false;

      for (const txn of sectionTxns) {
        if (!txn.suspectAmount) continue;
        const amtStr = txn.amount.toFixed(2);
        const digits = amtStr.split(".")[0];
        // Try stripping leading digits (up to 6 for jammed reference numbers)
        for (let strip = 1; strip <= Math.min(6, digits.length - 1); strip++) {
          const adjusted = parseFloat(digits.slice(strip) + "." + amtStr.split(".")[1]);
          const adjustedTotal = round2(parsedTotal - txn.amount + adjusted);
          if (Math.abs(adjustedTotal - statedTotal) < 0.01) {
            txn.amount = adjusted;
            txn.suspectAmount = false;
            parsedTotal = adjustedTotal;
            reconciled = true;
            break;
          }
        }
        if (reconciled) break;
      }
    }

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

  // 2. Balance-based reconciliation: if overall balance doesn't match,
  //    try stripping leading digits from suspect amounts (jammed reference
  //    numbers) until the balance equation works. This catches cases where
  //    section-total reconciliation couldn't run (e.g. missing totals).
  {
    let credits = round2(
      transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0)
    );
    let debits = round2(
      transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0)
    );
    let computed = round2(beginningBalance + credits - debits);

    if (Math.abs(computed - endingBalance) > 0.01) {
      for (const txn of transactions) {
        if (!txn.suspectAmount) continue;
        const amtStr = txn.amount.toFixed(2);
        const digits = amtStr.split(".")[0];
        for (let strip = 1; strip <= Math.min(6, digits.length - 1); strip++) {
          const adjusted = parseFloat(digits.slice(strip) + "." + amtStr.split(".")[1]);
          const adjCredits = txn.type === "credit" ? round2(credits - txn.amount + adjusted) : credits;
          const adjDebits = txn.type === "debit" ? round2(debits - txn.amount + adjusted) : debits;
          const adjComputed = round2(beginningBalance + adjCredits - adjDebits);
          if (Math.abs(adjComputed - endingBalance) < 0.01) {
            txn.amount = adjusted;
            txn.suspectAmount = false;
            credits = adjCredits;
            debits = adjDebits;
            computed = adjComputed;
            break;
          }
        }
        if (Math.abs(computed - endingBalance) < 0.01) break;
      }
    }
  }

  // 3. Verify overall balance: beginning + deposits - withdrawals = ending
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
function extractAmount(text: string): { amount: number; desc: string; suspect: boolean } | null {
  // Pattern 1: "Card NNNN" jammed against amount — "Card 6420167.57"
  // The card number is always 4 digits. The amount follows immediately.
  const cardAmtMatch = text.match(/^(.*Card \d{4})\$?([\d,]+\.\d{2})$/);
  if (cardAmtMatch) {
    return {
      amount: parseAmount(cardAmtMatch[2]),
      desc: cardAmtMatch[1].trim(),
      suspect: false,
    };
  }

  // Pattern 2: normal trailing amount (with optional $ sign)
  // Use strict comma formatting (\d{1,3}(,\d{3})*) so that jammed reference
  // numbers like "Transaction#:193284913151,285.00" don't get swallowed as a
  // single giant amount — only properly-placed commas count.
  const amtMatch = text.match(/\$?(\d{1,3}(?:,\d{3})*\.\d{2})$/);
  if (amtMatch) {
    let rawAmt = amtMatch[1];
    let amount = parseAmount(rawAmt);
    let descEnd = text.lastIndexOf(amtMatch[0]);

    // Check if the matched amount is jammed — preceded by a digit without
    // a $ sign. E.g. "Transaction#: 193284913151,000.00" where the regex
    // matches "151,000.00" but the leading "15" digits are from the ref.
    const isJammed = descEnd > 0 && /\d/.test(text[descEnd - 1]) && !amtMatch[0].startsWith("$");

    // Chase formats amounts >= $1,000 with commas. If we extracted a large
    // number with no comma and no $ sign, the leading digits are likely a
    // jammed reference number/instance count (e.g. "Jpm99BTR8J87225.00"
    // where "87" is part of the ref ID and "225.00" is the real amount).
    const digitsBeforeDecimal = rawAmt.split(".")[0];
    if (!rawAmt.includes(",") && !amtMatch[0].startsWith("$") && digitsBeforeDecimal.length >= 4) {
      // Take only the last 3 digits before the decimal as the real amount
      const fixedDigits = digitsBeforeDecimal.slice(-3);
      const jammed = digitsBeforeDecimal.slice(0, -3);
      rawAmt = fixedDigits + "." + rawAmt.split(".")[1];
      amount = parseAmount(rawAmt);
      descEnd = text.lastIndexOf(amtMatch[0]) + amtMatch[0].length - rawAmt.length;
    }

    // An amount is "suspect" when:
    // 1. Jammed with preceding reference digits (comma or not), OR
    // 2. No $ sign, no comma, and < $1,000 (ambiguous small amount)
    const suspect = isJammed || (!amtMatch[0].startsWith("$") && !rawAmt.includes(",") && amount < 1000);

    return {
      amount,
      desc: text.substring(0, descEnd).trim(),
      suspect,
    };
  }

  return null;
}

/**
 * Parse a savings TRANSACTION DETAIL section where each line has both
 * AMOUNT and BALANCE jammed together, e.g.:
 *   "01/30Interest Payment0.011,000.25"
 * We extract by matching the rightmost amount (balance), stripping it,
 * then matching the next rightmost amount (transaction amount).
 * Credit vs debit is determined by balance direction.
 */
function parseSavingsSectionFromIndex(
  text: string,
  startIdx: number,
  sectionName: string,
  year: number,
  beginningBalance: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const afterHeader = text.substring(startIdx);
  // End at "Ending Balance" line
  const endMatch = afterHeader.match(/^Ending Balance/m);
  const endIdx = endMatch ? startIdx + endMatch.index! : startIdx + 3000;

  const sectionText = text.substring(startIdx, endIdx);
  const lines = sectionText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\d+Pageof$/.test(l))
    .filter((l) => !/^\*(?:start|end)\*/.test(l))
    .filter((l) => !/^Account Number:/.test(l))
    .filter((l) => !/^\w+ \d{1,2}, \d{4} through /.test(l))
    .filter((l) => !/^Beginning Balance/.test(l));

  const dateStartRegex = /^(\d{2}\/\d{2})(.*)/;
  // Match TWO amounts at end: AMOUNT then BALANCE, possibly jammed together.
  // e.g. "Interest Payment0.011,000.25" → amount=0.01, balance=1,000.25
  const dualAmountRegex = /\$?(\d{1,3}(?:,\d{3})*\.\d{2})\$?(\d{1,3}(?:,\d{3})*\.\d{2})$/;

  let prevBalance = beginningBalance;

  for (const line of lines) {
    const dateMatch = line.match(dateStartRegex);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const rest = dateMatch[2];

    // Match both amount and balance from the end of the line
    const dualMatch = rest.match(dualAmountRegex);
    if (!dualMatch) continue;

    let amount = parseAmount(dualMatch[1]);
    const balance = parseAmount(dualMatch[2]);
    const desc = rest.substring(0, rest.lastIndexOf(dualMatch[0])).trim();

    // Determine type from balance direction
    const type: "debit" | "credit" = balance >= prevBalance ? "credit" : "debit";

    // Validate amount against balance change. If a reference number's digits
    // were jammed into the amount (e.g. "Transaction#: 193284913151,000.00"
    // where the regex matches 151,000 but the real amount is 1,000), the
    // balance-derived amount will be correct.
    const balanceDerivedAmount = round2(Math.abs(balance - prevBalance));
    if (balanceDerivedAmount > 0 && Math.abs(amount - balanceDerivedAmount) > 0.01) {
      amount = balanceDerivedAmount;
    }

    prevBalance = balance;

    const [month, day] = date.split("/");
    const dateStr = `${year}-${month}-${day}`;

    const cleanDescription = cleanChaseDescription(desc) || desc;

    transactions.push({
      date: dateStr,
      description: cleanDescription,
      rawDescription: desc,
      amount,
      type,
      section: sectionName,
    });
  }

  return transactions;
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
  const lines = sectionText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Strip pdf-parse page-break noise that could appear in multi-page sections
    .filter((l) => !/^\d+Pageof$/.test(l))
    .filter((l) => !/^\*(?:start|end)\*/.test(l))
    .filter((l) => !/^Account Number:/.test(l))
    .filter((l) => !/^\w+ \d{1,2}, \d{4} through /.test(l));

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
  let currentSuspect = false;

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
        suspectAmount: currentSuspect,
      });
    }
    currentDate = "";
    currentDescLines = [];
    currentAmount = null;
    currentSuspect = false;
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
        currentSuspect = extracted.suspect;
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
          // Amounts on continuation lines (like "CO Entry $13,099.00") are
          // standalone and reliable — not suspect
          currentSuspect = false;
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
