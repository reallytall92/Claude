import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

const DEFAULTS = {
  calorie_goal: "2000",
  protein_goal: "150",
  carbs_goal: "250",
  fat_goal: "65",
};

export async function GET() {
  const rows = await db.all<{ key: string; value: string }>(
    sql`SELECT key, value FROM user_settings`
  );
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    await db.run(
      sql`INSERT INTO user_settings (key, value) VALUES (${key}, ${String(value)})
          ON CONFLICT(key) DO UPDATE SET value = ${String(value)}`
    );
  }
  // Return updated settings
  const rows = await db.all<{ key: string; value: string }>(
    sql`SELECT key, value FROM user_settings`
  );
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}
