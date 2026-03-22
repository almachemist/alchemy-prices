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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, amount, period, notes } = body;

    if (!name || !amount || !period) {
      return NextResponse.json(
        { error: "Name, amount, and period are required" },
        { status: 400 }
      );
    }

    const result = await prisma.overheadCost.create({
      data: {
        name,
        amount: parseFloat(amount),
        period,
        notes: notes || null,
        active: true,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/overhead error:", error);
    return NextResponse.json(
      { error: "Failed to create overhead cost", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
