import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await prisma.$executeRawUnsafe(
      `UPDATE PricingProfile SET estimatedUnitsPerMonth = ? WHERE id = ?`,
      body.estimatedUnitsPerMonth,
      Number(id)
    );
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/pricing-profile/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
