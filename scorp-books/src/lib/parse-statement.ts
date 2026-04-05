import { parseChaseStatement, type ParsedStatement } from "./parsers/chase";

/**
 * Detect the bank from statement text and parse accordingly.
 * Currently only supports Chase accessible PDFs.
 */
export function parseStatement(text: string): ParsedStatement & { bank: string } {
  // Chase detection: look for JPMorgan Chase or Chase-specific markers
  if (
    text.includes("JPMorgan Chase") ||
    text.includes("Chase.com") ||
    text.includes("*start*summary")
  ) {
    return { ...parseChaseStatement(text), bank: "chase" };
  }

  throw new Error(
    "Could not identify the bank from this statement. Currently only Chase statements are supported."
  );
}

export type { ParsedStatement };
export type { ParsedTransaction, VerificationWarning } from "./parsers/chase";
