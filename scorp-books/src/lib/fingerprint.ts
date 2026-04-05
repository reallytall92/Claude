import { createHash } from "crypto";

/**
 * Generate a transaction fingerprint for duplicate detection.
 * Hashes: date + amount + rawDescription + accountId + type
 */
export function transactionFingerprint(txn: {
  date: string;
  amount: number;
  rawDescription: string | null;
  accountId: number;
  type: string;
}): string {
  const input = [
    txn.date,
    txn.amount.toFixed(2),
    (txn.rawDescription ?? "").toLowerCase().trim(),
    txn.accountId,
    txn.type,
  ].join("|");

  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
