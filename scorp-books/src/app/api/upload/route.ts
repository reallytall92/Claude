import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { statementUploads, transactions, classificationRules } from "@/lib/db/schema";
import { parseStatement } from "@/lib/parse-statement";
import { transactionFingerprint } from "@/lib/fingerprint";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const accountId = formData.get("accountId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: "No account selected" }, { status: 400 });
  }

  // Save the file locally
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const statementsDir = join(process.cwd(), "data", "statements");
  await mkdir(statementsDir, { recursive: true });

  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(statementsDir, filename);
  await writeFile(filepath, buffer);

  // Parse PDF text
  let pdfText: string;
  try {
    // Use the direct path to avoid pdf-parse's test file loading issue with bundlers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const pdfData = await pdfParse(buffer);
    pdfText = pdfData.text;
  } catch {
    return NextResponse.json(
      { error: "Failed to extract text from PDF. Is this a valid PDF file?" },
      { status: 400 }
    );
  }

  // Parse the statement
  let parsed;
  try {
    parsed = parseStatement(pdfText);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to parse statement";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Create statement upload record
  const upload = await db
    .insert(statementUploads)
    .values({
      filename,
      accountId: Number(accountId),
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      beginningBalance: parsed.beginningBalance,
      endingBalance: parsed.endingBalance,
      parsedCount: parsed.transactions.length,
      status: "parsed",
    })
    .returning();

  // Compute fingerprints for parsed transactions and check for duplicates
  const acctId = Number(accountId);
  const parsedWithFingerprints = parsed.transactions.map((txn) => ({
    ...txn,
    fingerprint: transactionFingerprint({
      date: txn.date,
      amount: txn.amount,
      rawDescription: txn.rawDescription ?? null,
      accountId: acctId,
      type: txn.type,
    }),
  }));

  // Look up which fingerprints already exist in the database
  const allFingerprints = parsedWithFingerprints.map((t) => t.fingerprint);
  const uniqueFingerprints = [...new Set(allFingerprints)];

  // Query in batches of 500 to stay within SQLite variable limits
  const existingFingerprintSet = new Set<string>();
  for (let i = 0; i < uniqueFingerprints.length; i += 500) {
    const batch = uniqueFingerprints.slice(i, i + 500);
    const existing = await db
      .select({ fingerprint: transactions.fingerprint })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, acctId),
          inArray(transactions.fingerprint, batch)
        )
      );
    for (const row of existing) {
      if (row.fingerprint) existingFingerprintSet.add(row.fingerprint);
    }
  }

  // Count how many times each fingerprint appears in existing DB
  // to handle legitimate duplicates (e.g. two identical purchases same day)
  const existingCounts = new Map<string, number>();
  if (existingFingerprintSet.size > 0) {
    for (let i = 0; i < uniqueFingerprints.length; i += 500) {
      const batch = uniqueFingerprints.slice(i, i + 500).filter((fp) => existingFingerprintSet.has(fp));
      if (batch.length === 0) continue;
      const rows = await db
        .select({ fingerprint: transactions.fingerprint })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, acctId),
            inArray(transactions.fingerprint, batch)
          )
        );
      for (const row of rows) {
        if (row.fingerprint) {
          existingCounts.set(row.fingerprint, (existingCounts.get(row.fingerprint) ?? 0) + 1);
        }
      }
    }
  }

  // Mark duplicates: for each fingerprint, allow N incoming where N matches
  // how many times it appears in the incoming batch minus existing count
  const incomingCounts = new Map<string, number>();
  const transactionsWithDuplicateFlag = parsedWithFingerprints.map((txn) => {
    const fp = txn.fingerprint;
    const seenSoFar = incomingCounts.get(fp) ?? 0;
    incomingCounts.set(fp, seenSoFar + 1);

    const existingCount = existingCounts.get(fp) ?? 0;
    // If we've already "used up" the existing count with prior incoming txns,
    // this one is new. Otherwise it's a duplicate.
    const isDuplicate = seenSoFar < existingCount;

    return { ...txn, isDuplicate };
  });

  // Return parsed transactions for review (don't save yet — user reviews first)
  return NextResponse.json({
    upload: upload[0],
    statement: {
      bank: parsed.bank,
      accountNumber: parsed.accountNumber,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      beginningBalance: parsed.beginningBalance,
      endingBalance: parsed.endingBalance,
    },
    transactions: transactionsWithDuplicateFlag,
    verification: parsed.verification,
    duplicateCount: transactionsWithDuplicateFlag.filter((t) => t.isDuplicate).length,
  });
}

// Confirm and save reviewed transactions
export async function PUT(request: Request) {
  const data = await request.json();
  const { uploadId, accountId, confirmedTransactions } = data;

  // Load all classification rules up front for auto-matching
  const allRules = await db
    .select()
    .from(classificationRules)
    .orderBy(desc(classificationRules.priority));

  function matchRule(description: string) {
    const lower = description.toLowerCase();
    for (const rule of allRules) {
      if (lower.includes(rule.pattern.toLowerCase())) {
        return rule.categoryId;
      }
    }
    return null;
  }

  const acctId = Number(accountId);
  const saved = [];
  let skippedDuplicates = 0;

  for (const txn of confirmedTransactions) {
    // Compute fingerprint
    const fp = transactionFingerprint({
      date: txn.date,
      amount: txn.amount,
      rawDescription: txn.rawDescription ?? null,
      accountId: acctId,
      type: txn.type,
    });

    // Final duplicate guard — check if this fingerprint already exists
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, acctId),
          eq(transactions.fingerprint, fp)
        )
      );

    if (existing.length > 0) {
      skippedDuplicates++;
      continue;
    }

    // If user already assigned a category, keep it. Otherwise try rules.
    let categoryId = txn.categoryId ? Number(txn.categoryId) : null;
    let classificationSource: "manual" | "rule" | "verified" | null = txn.categoryId ? "manual" : null;

    if (!categoryId) {
      const ruleMatch = matchRule(txn.description || txn.rawDescription || "");
      if (ruleMatch) {
        categoryId = ruleMatch;
        classificationSource = "rule";
      }
    }

    const result = await db
      .insert(transactions)
      .values({
        date: txn.date,
        amount: txn.amount,
        description: txn.description,
        rawDescription: txn.rawDescription,
        accountId: acctId,
        categoryId,
        type: txn.type,
        source: "upload",
        classificationSource,
        statementUploadId: Number(uploadId),
        fingerprint: fp,
      })
      .returning();
    saved.push(result[0]);
  }

  // Update upload status
  await db
    .update(statementUploads)
    .set({ status: "reviewed", parsedCount: saved.length })
    .where(eq(statementUploads.id, Number(uploadId)));

  return NextResponse.json({ saved: saved.length, skippedDuplicates });
}
