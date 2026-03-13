import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.recipeLineItem.create({
    data: {
      recipeId: Number(id),
      sourceType: "INVENTORY_ITEM",
      sourceInventoryItemId: body.inventoryItemId,
      quantity: body.quantity,
      unit: body.unit,
    },
    include: {
      sourceInventoryItem: { include: { essentialOilSpec: true } },
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const item = await prisma.recipeLineItem.update({
    where: { id: body.lineItemId },
    data: {
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.inventoryItemId !== undefined && { sourceInventoryItemId: body.inventoryItemId }),
    },
    include: {
      sourceInventoryItem: { include: { essentialOilSpec: true } },
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  await prisma.recipeLineItem.delete({ where: { id: body.lineItemId } });
  return NextResponse.json({ ok: true });
}
