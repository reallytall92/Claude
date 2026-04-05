import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isNull, eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { transactionFingerprint } from "../src/lib/fingerprint";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/books.db",
  });
  const db = drizzle(client, { schema });

  const rows = await db
    .select()
    .from(schema.transactions)
    .where(isNull(schema.transactions.fingerprint));

  console.log(`Found ${rows.length} transactions without fingerprints`);

  for (const row of rows) {
    const fp = transactionFingerprint({
      date: row.date,
      amount: row.amount,
      rawDescription: row.rawDescription,
      accountId: row.accountId,
      type: row.type,
    });
    await db
      .update(schema.transactions)
      .set({ fingerprint: fp })
      .where(eq(schema.transactions.id, row.id));
  }

  console.log(`Backfilled ${rows.length} fingerprints`);
}

main().catch(console.error);
