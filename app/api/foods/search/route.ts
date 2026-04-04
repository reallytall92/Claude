export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foods } from "@/lib/db/schema";
import { like, or, desc } from "drizzle-orm";
import { searchUSDA } from "@/lib/usda";
import { searchOFF } from "@/lib/off";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  // 1. Local DB results (favorites first)
  const localResults = await db
    .select()
    .from(foods)
    .where(or(like(foods.name, `%${q}%`), like(foods.brand, `%${q}%`)))
    .orderBy(desc(foods.is_favorite))
    .limit(5);

  // 2. Fan out to USDA + OFF in parallel
  const [usdaResults, offResults] = await Promise.allSettled([
    searchUSDA(q),
    searchOFF(q),
  ]);

  const usda = usdaResults.status === "fulfilled" ? usdaResults.value : [];
  const off = offResults.status === "fulfilled" ? offResults.value : [];

  // 3. Merge, dedup by external_id against local cache
  const localExternalIds = new Set(localResults.map((f) => f.external_id).filter(Boolean));

  const remote = [...usda, ...off].filter(
    (f) => f.external_id && !localExternalIds.has(f.external_id)
  );

  // Deduplicate remote by external_id
  const seen = new Set<string>();
  const deduped = remote.filter((f) => {
    if (seen.has(f.external_id)) return false;
    seen.add(f.external_id);
    return true;
  });

  const combined = [
    ...localResults.map((f) => ({ ...f, _cached: true })),
    ...deduped.slice(0, 15).map((f) => ({ ...f, _cached: false })),
  ];

  return NextResponse.json(combined);
}
