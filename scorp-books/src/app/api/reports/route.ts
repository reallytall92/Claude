import { NextResponse } from "next/server";
import { generateProfitLoss } from "@/lib/reports/profit-loss";
import { generateBalanceSheet } from "@/lib/reports/balance-sheet";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const periodStart = url.searchParams.get("periodStart");
  const periodEnd = url.searchParams.get("periodEnd");
  const asOfDate = url.searchParams.get("asOfDate");

  if (type === "profit-loss") {
    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "periodStart and periodEnd required" }, { status: 400 });
    }
    const report = await generateProfitLoss(periodStart, periodEnd);
    return NextResponse.json(report);
  }

  if (type === "balance-sheet") {
    if (!asOfDate) {
      return NextResponse.json({ error: "asOfDate required" }, { status: 400 });
    }
    const report = await generateBalanceSheet(asOfDate);
    return NextResponse.json(report);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
