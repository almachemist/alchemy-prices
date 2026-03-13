import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { type OverheadRow, totalMonthlyOverhead, overheadPerUnit } from "../../lib/pricing";

export async function GET() {
  const overheadRows = await prisma.$queryRawUnsafe<OverheadRow[]>(
    `SELECT id, name, amount, period, notes, active FROM OverheadCost WHERE active = 1 ORDER BY name`,
  );

  type ProfileRow = { estimatedUnitsPerMonth: number | null };
  const profileRows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT estimatedUnitsPerMonth FROM PricingProfile WHERE name = 'Default' LIMIT 1`,
  );
  const estimatedUnitsPerMonth = profileRows[0]?.estimatedUnitsPerMonth ?? 50;

  return NextResponse.json({
    overheadRows,
    estimatedUnitsPerMonth,
    totalMonthly: totalMonthlyOverhead(overheadRows),
    perUnit: overheadPerUnit(overheadRows, estimatedUnitsPerMonth),
  });
}
