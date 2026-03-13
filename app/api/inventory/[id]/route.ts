import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.inventoryItem.update({
    where: { id: Number(id) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.unitType !== undefined && { unitType: body.unitType }),
      ...(body.purchaseSize !== undefined && { purchaseSize: body.purchaseSize }),
      ...(body.purchaseUnit !== undefined && { purchaseUnit: body.purchaseUnit }),
      ...(body.purchaseCostAud !== undefined && { purchaseCostAud: body.purchaseCostAud }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { essentialOilSpec: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.inventoryItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
