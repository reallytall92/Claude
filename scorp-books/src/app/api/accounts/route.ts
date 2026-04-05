import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts, chartOfAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const accounts = await db.select().from(bankAccounts).orderBy(bankAccounts.name);
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const data = await request.json();

  let linkedCode = "1010";
  if (data.type === "savings") linkedCode = "1020";
  if (data.type === "credit_card") linkedCode = "2010";

  const linkedAcct = await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.code, linkedCode))
    .limit(1);

  const result = await db
    .insert(bankAccounts)
    .values({
      name: data.name,
      type: data.type,
      institution: data.institution || null,
      last4: data.last4 || null,
      currentBalance: Number(data.currentBalance) || 0,
      linkedAccountId: linkedAcct[0]?.id ?? null,
    })
    .returning();

  return NextResponse.json(result[0]);
}

export async function PUT(request: Request) {
  const data = await request.json();

  await db
    .update(bankAccounts)
    .set({
      name: data.name,
      type: data.type,
      institution: data.institution || null,
      last4: data.last4 || null,
      currentBalance: Number(data.currentBalance) || 0,
    })
    .where(eq(bankAccounts.id, data.id));

  return NextResponse.json({ success: true });
}
