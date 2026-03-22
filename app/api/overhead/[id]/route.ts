import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    await prisma.overheadCost.update({
      where: { id: Number(id) },
      data: {
        ...(body.active !== undefined && { active: body.active }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.period !== undefined && { period: body.period }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/overhead/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update overhead cost", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.overheadCost.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/overhead/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete overhead cost", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
