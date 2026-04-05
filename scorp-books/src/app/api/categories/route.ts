import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const categories = await db
    .select()
    .from(chartOfAccounts)
    .orderBy(chartOfAccounts.code);
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const data = await request.json();

  const result = await db
    .insert(chartOfAccounts)
    .values({
      code: data.code,
      name: data.name,
      friendlyName: data.friendlyName || data.name,
      description: data.description || null,
      type: data.type,
      group: data.group || null,
      isDefault: false,
      isActive: true,
    })
    .returning();

  return NextResponse.json(result[0]);
}

export async function PUT(request: Request) {
  const data = await request.json();

  if (data.action === "toggle_active") {
    const current = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, data.id))
      .limit(1);

    if (current.length > 0) {
      await db
        .update(chartOfAccounts)
        .set({ isActive: !current[0].isActive })
        .where(eq(chartOfAccounts.id, data.id));
    }
    return NextResponse.json({ success: true });
  }

  await db
    .update(chartOfAccounts)
    .set({
      friendlyName: data.friendlyName,
      description: data.description,
      group: data.group,
    })
    .where(eq(chartOfAccounts.id, data.id));

  return NextResponse.json({ success: true });
}
