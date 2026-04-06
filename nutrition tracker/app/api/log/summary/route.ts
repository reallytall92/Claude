export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log_entries } from "@/lib/db/schema";
import { sql, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
  }

  const startDate = `${month}-01`;
  // Last day of month
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = await db
    .select({
      date: log_entries.date,
      calories: sql<number>`sum(${log_entries.calories})`,
      protein: sql<number>`sum(${log_entries.protein})`,
      carbs: sql<number>`sum(${log_entries.carbs})`,
      fat: sql<number>`sum(${log_entries.fat})`,
      entryCount: sql<number>`count(*)`,
    })
    .from(log_entries)
    .where(and(gte(log_entries.date, startDate), lte(log_entries.date, endDate)))
    .groupBy(log_entries.date);

  return NextResponse.json(rows);
}
